from pydantic import BaseModel


class StkPushRequest(BaseModel):
    phone: str
    amount: float
    account_reference: str
    transaction_desc: str = "Payment"


class StkCallbackBody(BaseModel):
    stk_callback: dict


class C2BConfirmation(BaseModel):
    TransactionType: str
    TransID: str
    TransTime: str
    TransAmount: str
    BusinessShortCode: str
    BillRefNumber: str
    InvoiceNumber: str
    OrgAccountBalance: str
    ThirdPartyTransID: str
    MSISDN: str
    FirstName: str
    MiddleName: str | None = None
    LastName: str | None = None


class B2CResult(BaseModel):
    Result: dict
