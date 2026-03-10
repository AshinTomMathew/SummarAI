from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

def run_vault_context_test():
    # Setup Driver
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()))
    
    print("🚀 [TEST] Starting Intelligence Vault Context Switching Test...")
    
    try:
        # 1. Load Chat Hub
        driver.get("http://localhost:5173/chat")
        
        # 2. Click the 'Vault' button in the header
        print("🖱️ [STEP 1] Opening Meeting Vault...")
        vault_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Vault')]"))
        )
        vault_btn.click()
        
        # 3. Verify Sidebar is open
        print("📂 [STEP 2] Verifying 'Meeting Vault' sidebar visibility...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Meeting Vault')]"))
        )
        
        # 4. Select the first available historical session
        print("🎯 [STEP 3] Selecting a historical session to switch context...")
        session_card = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, ".group\/card"))
        )
        selected_title = session_card.find_element(By.TAG_NAME, "p").text
        print(f"📄 [INFO] Switching to meeting: '{selected_title}'")
        session_card.click()
        
        # 5. Verify the main header updates to the selected session
        print("⏳ [STEP 4] Verifying header synchronization...")
        header_title = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, f"//h2[contains(text(), '{selected_title}')]"))
        )
        
        if header_title:
            print(f"✅ [SUCCESS] Context successfully switched to: {selected_title}")
        
    except Exception as e:
        print(f"❌ [FAILURE] Context switch failed: {str(e)}")
        driver.save_screenshot("vault_failure.png")
        
    finally:
        print("🏁 [TEST] Closing browser.")
        driver.quit()

if __name__ == "__main__":
    run_vault_context_test()
