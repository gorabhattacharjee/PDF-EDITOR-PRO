"""
Comprehensive Functional Test Suite for PDF Editor Pro
Tests all major features across all tabs and functionality
"""

import pytest
from playwright.sync_api import Page, expect
import time


class TestFileMenuOperations:
    """Tests for File menu operations"""
    
    def test_file_menu_visibility(self, page: Page):
        """Verify File menu is visible and clickable"""
        file_menu = page.get_by_text("File", exact=True)
        expect(file_menu).to_be_visible()
        expect(file_menu).to_be_enabled()
        file_menu.click()
        page.wait_for_timeout(200)
    
    def test_save_as_functionality(self, page: Page):
        """Test Save As menu item is accessible"""
        page.get_by_text("File", exact=True).click()
        page.wait_for_timeout(200)
        save_as = page.get_by_text("Save As", exact=True)
        expect(save_as).to_be_visible()


class TestHomeTab:
    """Tests for Home tab features"""
    
    def test_home_tab_loads(self, page: Page):
        """Verify Home tab is visible and clickable"""
        home_tab = page.get_by_text("Home", exact=True)
        expect(home_tab).to_be_visible()
        home_tab.click()
        page.wait_for_timeout(300)
    
    def test_open_button_present(self, page: Page):
        """Verify Open button exists in Home tab"""
        page.get_by_text("Home", exact=True).click()
        page.wait_for_timeout(300)
        open_btn = page.get_by_role("button").filter(has_text="Open")
        expect(open_btn).to_be_visible()
    
    def test_ocr_button_clickable(self, page: Page):
        """Test OCR button is present and clickable"""
        page.get_by_text("Home", exact=True).click()
        page.wait_for_timeout(300)
        ocr_btn = page.get_by_text("OCR", exact=True)
        expect(ocr_btn).to_be_visible()
        expect(ocr_btn).to_be_enabled()
        try:
            ocr_btn.click()
            page.wait_for_timeout(200)
        except Exception:
            # Expected to fail without PDF loaded
            pass
    
    def test_to_image_button_present(self, page: Page):
        """Verify To Image button exists"""
        page.get_by_text("Home", exact=True).click()
        page.wait_for_timeout(300)
        to_image = page.get_by_text("To Image", exact=True)
        expect(to_image).to_be_visible()
        expect(to_image).to_be_enabled()
    
    def test_to_text_button_present(self, page: Page):
        """Verify To Text button exists"""
        page.get_by_text("Home", exact=True).click()
        page.wait_for_timeout(300)
        to_text = page.get_by_text("To Text", exact=True)
        expect(to_text).to_be_visible()
        expect(to_text).to_be_enabled()
    
    def test_to_office_button_present(self, page: Page):
        """Verify To Office button exists"""
        page.get_by_text("Home", exact=True).click()
        page.wait_for_timeout(300)
        to_office = page.get_by_text("To Office", exact=True)
        expect(to_office).to_be_visible()
        expect(to_office).to_be_enabled()


class TestEditTab:
    """Tests for Edit tab features"""
    
    def test_edit_tab_loads(self, page: Page):
        """Verify Edit tab is visible and clickable"""
        edit_tab = page.get_by_text("Edit", exact=True)
        expect(edit_tab).to_be_visible()
        edit_tab.click()
        page.wait_for_timeout(300)
    
    def test_crop_page_button_present(self, page: Page):
        """Verify Crop Page button exists in Edit tab"""
        page.get_by_text("Edit", exact=True).click()
        page.wait_for_timeout(300)
        crop_btn = page.get_by_text("Crop Page", exact=True)
        expect(crop_btn).to_be_visible()
        expect(crop_btn).to_be_enabled()


class TestConvertTab:
    """Tests for Convert tab features"""
    
    def test_convert_tab_loads(self, page: Page):
        """Verify Convert tab is visible and clickable"""
        convert_tab = page.get_by_text("Convert", exact=True)
        expect(convert_tab).to_be_visible()
        convert_tab.click()
        page.wait_for_timeout(300)
    
    def test_to_word_button_present(self, page: Page):
        """Verify To Word button exists"""
        page.get_by_text("Convert", exact=True).click()
        page.wait_for_timeout(300)
        to_word = page.get_by_text("To Word", exact=True)
        expect(to_word).to_be_visible()
    
    def test_to_excel_button_present(self, page: Page):
        """Verify To Excel button exists"""
        page.get_by_text("Convert", exact=True).click()
        page.wait_for_timeout(300)
        to_excel = page.get_by_text("To Excel", exact=True)
        expect(to_excel).to_be_visible()
    
    def test_to_ppt_button_present(self, page: Page):
        """Verify To PowerPoint button exists"""
        page.get_by_text("Convert", exact=True).click()
        page.wait_for_timeout(300)
        to_ppt = page.get_by_text("To PowerPoint", exact=True)
        expect(to_ppt).to_be_visible()


class TestPageTab:
    """Tests for Page tab features"""
    
    def test_page_tab_loads(self, page: Page):
        """Verify Page tab is visible and clickable"""
        page_tab = page.get_by_text("Page", exact=True)
        expect(page_tab).to_be_visible()
        page_tab.click()
        page.wait_for_timeout(300)
    
    def test_insert_button_present(self, page: Page):
        """Verify Insert button exists in Page tab"""
        page.get_by_text("Page", exact=True).click()
        page.wait_for_timeout(300)
        insert_btn = page.get_by_text("Insert", exact=True)
        expect(insert_btn).to_be_visible()
    
    def test_delete_button_present(self, page: Page):
        """Verify Delete button exists in Page tab"""
        page.get_by_text("Page", exact=True).click()
        page.wait_for_timeout(300)
        delete_btn = page.get_by_text("Delete", exact=True)
        expect(delete_btn).to_be_visible()
        expect(delete_btn).to_be_enabled()


class TestProtectTab:
    """Tests for Protect tab features"""
    
    def test_protect_tab_loads(self, page: Page):
        """Verify Protect tab is visible and clickable"""
        protect_tab = page.get_by_text("Protect", exact=True)
        expect(protect_tab).to_be_visible()
        protect_tab.click()
        page.wait_for_timeout(300)
    
    def test_encrypt_button_present(self, page: Page):
        """Verify Encrypt button exists in Protect tab"""
        page.get_by_text("Protect", exact=True).click()
        page.wait_for_timeout(300)
        encrypt_btn = page.get_by_text("Encrypt", exact=True)
        expect(encrypt_btn).to_be_visible()
        expect(encrypt_btn).to_be_enabled()
    
    def test_permissions_button_present(self, page: Page):
        """Verify Permissions button exists"""
        page.get_by_text("Protect", exact=True).click()
        page.wait_for_timeout(300)
        permissions_btn = page.get_by_text("Permissions", exact=True)
        expect(permissions_btn).to_be_visible()


class TestMergeTab:
    """Tests for Merge PDF tab features"""
    
    def test_merge_tab_loads(self, page: Page):
        """Verify Merge PDF tab is visible and clickable"""
        merge_tab = page.get_by_text("Merge PDF", exact=True)
        expect(merge_tab).to_be_visible()
        merge_tab.click()
        page.wait_for_timeout(300)
    
    def test_add_pdfs_button_present(self, page: Page):
        """Verify Add PDFs button exists"""
        page.get_by_text("Merge PDF", exact=True).click()
        page.wait_for_timeout(300)
        add_pdfs = page.get_by_text("Add PDFs", exact=True)
        expect(add_pdfs).to_be_visible()


class TestToolsTab:
    """Tests for Tools tab features"""
    
    def test_tools_tab_loads(self, page: Page):
        """Verify Tools tab is visible and clickable"""
        tools_tab = page.get_by_text("Tools", exact=True)
        expect(tools_tab).to_be_visible()
        tools_tab.click()
        page.wait_for_timeout(300)
    
    def test_split_button_present(self, page: Page):
        """Verify Split button exists in Tools tab"""
        page.get_by_text("Tools", exact=True).click()
        page.wait_for_timeout(300)
        split_btn = page.get_by_text("Split", exact=True)
        expect(split_btn).to_be_visible()
    
    def test_compress_button_present(self, page: Page):
        """Verify Compress button exists"""
        page.get_by_text("Tools", exact=True).click()
        page.wait_for_timeout(300)
        compress_btn = page.get_by_text("Compress", exact=True)
        expect(compress_btn).to_be_visible()
    
    def test_flatten_button_present(self, page: Page):
        """Verify Flatten button exists"""
        page.get_by_text("Tools", exact=True).click()
        page.wait_for_timeout(300)
        flatten_btn = page.get_by_text("Flatten", exact=True)
        expect(flatten_btn).to_be_visible()
        expect(flatten_btn).to_be_enabled()
    
    def test_ocr_advanced_button_present(self, page: Page):
        """Verify OCR Advanced button exists"""
        page.get_by_text("Tools", exact=True).click()
        page.wait_for_timeout(300)
        ocr_adv = page.get_by_text("OCR Advanced", exact=True)
        expect(ocr_adv).to_be_visible()
        expect(ocr_adv).to_be_enabled()


class TestCommentTab:
    """Tests for Comment tab features"""
    
    def test_comment_tab_loads(self, page: Page):
        """Verify Comment tab is visible and clickable"""
        comment_tab = page.get_by_text("Comment", exact=True)
        expect(comment_tab).to_be_visible()
        comment_tab.click()
        page.wait_for_timeout(300)


class TestUILayout:
    """Tests for overall UI layout and structure"""
    
    def test_ribbon_bar_visible(self, page: Page):
        """Verify ribbon bar is visible"""
        ribbon_tabs = ["Home", "Comment", "Edit", "Convert", "Page", "Merge PDF", "Protect", "Tools"]
        for tab in ribbon_tabs:
            expect(page.get_by_text(tab, exact=True)).to_be_visible()
    
    def test_all_tabs_clickable(self, page: Page):
        """Verify all ribbon tabs are clickable"""
        ribbon_tabs = ["Home", "Comment", "Edit", "Convert", "Page", "Merge PDF", "Protect", "Tools"]
        for tab in ribbon_tabs:
            tab_element = page.get_by_text(tab, exact=True)
            tab_element.click()
            page.wait_for_timeout(200)


@pytest.fixture(scope="session")
def page_url():
    """Return the app URL"""
    return "http://localhost:3000"
