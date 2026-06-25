import base64
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings


class DarajaClient:
    def __init__(self):
        self._token: str | None = None
        self._token_expiry: datetime | None = None

    @property
    def consumer_key(self) -> str:
        return settings.MPESA_CONSUMER_KEY

    @property
    def consumer_secret(self) -> str:
        return settings.MPESA_CONSUMER_SECRET

    @property
    def passkey(self) -> str:
        return settings.MPESA_PASSKEY

    @property
    def shortcode(self) -> str:
        return settings.MPESA_SHORTCODE

    @property
    def environment(self) -> str:
        return settings.MPESA_ENVIRONMENT

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

    async def _get_token(self) -> str:
        now = datetime.utcnow()
        if self._token and self._token_expiry and now < self._token_expiry:
            return self._token

        url = f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials"
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                url,
                auth=(self.consumer_key, self.consumer_secret),
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            self._token = data["access_token"]
            expires_in = data.get("expires_in", 3600)
            self._token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in - 60)
            return self._token

    async def _post(self, path: str, payload: dict) -> dict:
        token = await self._get_token()
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {token}"},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
            return data

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
