from decimal import Decimal, ROUND_HALF_UP

KENYA_VAT_RATE = Decimal("16.00")


def calculate_vat(amount: float, rate: float | None = None) -> float:
    rate = rate or float(KENYA_VAT_RATE)
    vat = Decimal(str(amount)) * (Decimal(str(rate)) / Decimal("100"))
    return float(vat.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def calculate_total_with_vat(subtotal: float, taxable: bool = True) -> tuple[float, float]:
    vat = calculate_vat(subtotal) if taxable else 0.0
    total = subtotal + vat
    return round(total, 2), vat


def calculate_daily_rate(price: float, days_in_cycle: int = 30) -> float:
    return float(
        (Decimal(str(price)) / Decimal(str(days_in_cycle))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )
    )
