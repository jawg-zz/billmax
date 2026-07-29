import asyncio
import base64
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings

# M-Pesa STK Push limits from Safaricom docs
MAX_RETRIES = 2  # 3 total attempts (initial + 2 retries)
RETRY_DELAYS = [2.0, 4.0]  # seconds between retries


class DarajaError(Exception):
    """Raised when the Daraja API returns a non-success status."""


class DarajaClient:
    def __init__(
        self,
        consumer_key: str,
        consumer_secret: str,
        passkey: str,
        shortcode: str,
        environment: str,
    ):
        self.consumer_key = consumer_key
        self.consumer_secret = consumer_secret
        self.passkey = passkey
        self.shortcode = shortcode
        self.environment = environment
        self._token: str | None = None
        self._token_expiry: datetime | None = None
        self._client: httpx.AsyncClient | None = None

    @classmethod
    def from_settings(cls) -> "DarajaClient":
        """Factory that reads current settings. Call fresh for each request."""
        return cls(
            consumer_key=settings.MPESA_CONSUMER_KEY,
            consumer_secret=settings.MPESA_CONSUMER_SECRET,
            passkey=settings.MPESA_PASSKEY,
            shortcode=settings.MPESA_SHORTCODE,
            environment=settings.MPESA_ENVIRONMENT,
        )

    @property
    def base_url(self) -> str:
        if self.environment == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    def _timestamp(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")

    def _password(self, timestamp: str) -> str:
        raw = f"{self.shortcode}{self.passkey}{timestamp}"
        return base64.b64encode(raw.encode()).decode()

    async def _get_client(self) -> httpx.AsyncClient:
        """Return a reusable connection-pooled client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30)
        return self._client

    async def _close_client(self):
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def _get_token(self) -> str:
        now = datetime.now(timezone.utc)
        if self._token and self._token_expiry and now < self._token_expiry:
            return self._token  # pyright: ignore[reportReturnType]

        client = await self._get_client()
        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                resp = await client.get(
                    url,
                    auth=(self.consumer_key, self.consumer_secret),
                )
                resp.raise_for_status()
                data = resp.json()
                self._token = data["access_token"]
                expires_in = int(data.get("expires_in", 3600))
                self._token_expiry = datetime.now(timezone.utc) + timedelta(
                    seconds=expires_in - 60
                )
                return self._token
            except (httpx.RequestError, httpx.HTTPStatusError) as e:
                last_error = e
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
        raise DarajaError(
            f"Failed to get OAuth token after {MAX_RETRIES + 1} attempts: {last_error}"
        ) from last_error

    async def _post(self, path: str, payload: dict) -> dict:
        """POST to Daraja with retry logic for transient failures."""
        client = await self._get_client()
        url = f"{self.base_url}{path}"

        last_error: Exception | None = None
        for attempt in range(MAX_RETRIES + 1):
            try:
                token = await self._get_token()
                resp = await client.post(
                    url,
                    json=payload,
                    headers={"Authorization": f"Bearer {token}"},
                )
                data = resp.json()
                if not resp.is_success:
                    raise DarajaError(
                        f"M-Pesa API {resp.status_code}: "
                        f"{data.get('errorMessage', data.get('errorCode', data))}"
                    )
                return data
            except (httpx.RequestError, httpx.TimeoutException) as e:
                # Transient network errors — retry
                last_error = e
                if attempt < MAX_RETRIES:
                    await asyncio.sleep(RETRY_DELAYS[attempt])
                    continue
                raise DarajaError(
                    f"M-Pesa API request failed after {MAX_RETRIES + 1} attempts: {e}"
                ) from e
            except DarajaError:
                # Non-transient HTTP errors — don't retry
                raise
        raise DarajaError(
            f"M-Pesa API request failed after {MAX_RETRIES + 1} attempts: {last_error}"
        ) from last_error

    async def stk_push(
        self,
        phone: str,
        amount: float,
        account_reference: str,
        transaction_desc: str = "Payment",
    ) -> dict:
        timestamp = self._timestamp()
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": self._password(timestamp),
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone,
            "PartyB": self.shortcode,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": account_reference[:12],
            "TransactionDesc": transaction_desc[:13],
        }
        return await self._post("/mpesa/stkpush/v1/processrequest", payload)

    async def c2b_register_url(
        self, validation_url: str, confirmation_url: str
    ) -> dict:
        payload = {
            "ShortCode": self.shortcode,
            "ResponseType": "Completed",
            "ConfirmationURL": confirmation_url,
            "ValidationURL": validation_url,
        }
        return await self._post("/mpesa/c2b/v1/registerurl", payload)

    async def b2c_payment(
        self,
        phone: str,
        amount: float,
        remarks: str,
        occasion: str = "",
    ) -> dict:
        payload = {
            "InitiatorName": settings.MPESA_INITIATOR_NAME or "testapi",
            "SecurityCredential": settings.MPESA_SECURITY_CREDENTIAL or "",
            "CommandID": "BusinessPayment",
            "Amount": int(amount),
            "PartyA": self.shortcode,
            "PartyB": phone,
            "Remarks": remarks[:100],
            "QueueTimeOutURL": f"{settings.MPESA_CALLBACK_URL}/b2c-timeout",
            "ResultURL": f"{settings.MPESA_CALLBACK_URL}/b2c-result",
            "Occasion": occasion[:100],
        }
        return await self._post("/mpesa/b2c/v1/paymentrequest", payload)

    async def query_status(self, checkout_request_id: str) -> dict:
        timestamp = self._timestamp()
        payload = {
            "BusinessShortCode": self.shortcode,
            "Password": self._password(timestamp),
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }
        return await self._post("/mpesa/stkpushquery/v1/query", payload)

    async def reverse(
        self,
        transaction_id: str,
        amount: float,
        receiver_party: str,
        remarks: str = "Reversal",
    ) -> dict:
        timestamp = self._timestamp()
        payload = {
            "Initiator": settings.MPESA_INITIATOR_NAME or "testapi",
            "SecurityCredential": settings.MPESA_SECURITY_CREDENTIAL or "",
            "CommandID": "TransactionReversal",
            "TransactionID": transaction_id,
            "Amount": int(amount),
            "ReceiverParty": receiver_party,
            "RecieverIdentifierType": "11",
            "QueueTimeOutURL": f"{settings.MPESA_CALLBACK_URL}/reversal-timeout",
            "ResultURL": f"{settings.MPESA_CALLBACK_URL}/reversal-result",
            "Remarks": remarks[:100],
            "Occasion": "",
        }
        return await self._post("/mpesa/reversal/v1/request", payload)
