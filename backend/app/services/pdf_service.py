import uuid
from pathlib import Path

from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.config import settings

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def render_invoice_pdf(
    invoice_number: str,
    issue_date: str,
    due_date: str,
    status: str,
    org_name: str,
    org_address: str | None,
    org_kra_pin: str | None,
    org_phone: str | None,
    org_email: str | None,
    customer_name: str,
    customer_phone: str,
    customer_email: str | None,
    customer_kra_pin: str | None,
    items: list[dict],
    subtotal: float,
    vat_amount: float,
    total: float,
    balance_due: float,
    notes: str | None = None,
    kra_etims_code: str | None = None,
    org_logo_url: str | None = None,
) -> bytes:
    template = env.get_template("invoices/invoice.html")
    html = template.render(
        invoice_number=invoice_number,
        issue_date=issue_date,
        due_date=due_date,
        status=status,
        org_name=org_name,
        org_address=org_address,
        org_kra_pin=org_kra_pin,
        org_phone=org_phone,
        org_email=org_email,
        org_logo_url=org_logo_url,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        customer_kra_pin=customer_kra_pin,
        items=items,
        subtotal=subtotal,
        vat_amount=vat_amount,
        total=total,
        balance_due=balance_due,
        notes=notes,
        kra_etims_code=kra_etims_code,
    )
    return HTML(string=html).write_pdf()


def render_email_template(template_name: str, **kwargs) -> str:
    template = env.get_template(f"emails/{template_name}")
    return template.render(**kwargs)
