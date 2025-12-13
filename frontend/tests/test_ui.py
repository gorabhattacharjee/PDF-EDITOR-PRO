import unittest
from appium import webdriver
from appium.options.windows import WindowsOptions
from appium.webdriver.common.appiumby import AppiumBy
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class TestUI(unittest.TestCase):
    def setUp(self):
        opts = WindowsOptions()
        opts.app = r"C:\PDFP\pdf-editor-pro\main.exe"
        opts.automation_name = "Windows"

        self.driver = webdriver.Remote(
            command_executor='http://127.0.0.1:4723',
            options=opts
        )
        self.wait = WebDriverWait(self.driver, 20)

    def tearDown(self):
        if self.driver:
            self.driver.quit()

    def test_file_menu_spec(self):
        file_menu = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "File Menu")))
        self.assertIsNotNone(file_menu, "File Menu not found")
        file_menu.click()
        self.assertIsNotNone(self.driver.find_element(AppiumBy.NAME, "Open"), "Open option not found")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.NAME, "Save"), "Save option not found")

    def test_home_tab_spec(self):
        home_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Home Tab")))
        self.assertIsNotNone(home_tab, "Home Tab not found")
        home_tab.click()
        self.assertTrue(home_tab.is_selected(), "Home Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-home-tool-id"), "Home tab tool not found")

    def test_comment_tab_tools(self):
        comment_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Comment Tab")))
        self.assertIsNotNone(comment_tab, "Comment Tab not found")
        comment_tab.click()
        self.assertTrue(comment_tab.is_selected(), "Comment Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-comment-tool-id"), "Comment tab tool not found")

    def test_edit_tab_spec(self):
        edit_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Edit Tab")))
        self.assertIsNotNone(edit_tab, "Edit Tab not found")
        edit_tab.click()
        self.assertTrue(edit_tab.is_selected(), "Edit Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-edit-tool-id"), "Edit tab tool not found")

    def test_page_tab_spec(self):
        page_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Page Tab")))
        self.assertIsNotNone(page_tab, "Page Tab not found")
        page_tab.click()
        self.assertTrue(page_tab.is_selected(), "Page Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-page-tool-id"), "Page tab tool not found")

    def test_protect_tab_spec(self):
        protect_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Protect Tab")))
        self.assertIsNotNone(protect_tab, "Protect Tab not found")
        protect_tab.click()
        self.assertTrue(protect_tab.is_selected(), "Protect Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-protect-tool-id"), "Protect tab tool not found")

    def test_convert_tab(self):
        convert_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Convert Tab")))
        self.assertIsNotNone(convert_tab, "Convert Tab not found")
        convert_tab.click()
        self.assertTrue(convert_tab.is_selected(), "Convert Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-convert-tool-id"), "Convert tab tool not found")

    def test_merge_pdf_tab(self):
        merge_pdf_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Merge PDF Tab")))
        self.assertIsNotNone(merge_pdf_tab, "Merge PDF Tab not found")
        merge_pdf_tab.click()
        self.assertTrue(merge_pdf_tab.is_selected(), "Merge PDF Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-merge-tool-id"), "Merge PDF tab tool not found")

    def test_tools_tab(self):
        tools_tab = self.wait.until(EC.presence_of_element_located((AppiumBy.NAME, "Tools Tab")))
        self.assertIsNotNone(tools_tab, "Tools Tab not found")
        tools_tab.click()
        self.assertTrue(tools_tab.is_selected(), "Tools Tab is not selected")
        self.assertIsNotNone(self.driver.find_element(AppiumBy.ACCESSIBILITY_ID, "some-tools-tool-id"), "Tools tab tool not found")

if __name__ == '__main__':
    unittest.main()