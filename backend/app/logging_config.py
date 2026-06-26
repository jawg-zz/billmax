import logging
import sys


def get_logger(name: str) -> logging.Logger:
    """Get a BillMax logger with consistent formatting."""
    logger = logging.getLogger(f"billmax.{name}")
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s.%(msecs)03dZ %(levelname)-7s %(name)s: %(message)s",
                datefmt="%Y-%m-%dT%H:%M:%S",
            )
        )
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
