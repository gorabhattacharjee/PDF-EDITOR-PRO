import pytest
from playwright.sync_api import Page

# The URL of the application to be tested.
# Change this if your app runs on a different port.
APP_URL = "http://localhost:3000"

@pytest.fixture
def page(page: Page):
    """
    A pytest fixture that navigates to the application URL
    before each test function.
    """
    page.goto(APP_URL)
    yield page