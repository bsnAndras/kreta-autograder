const toggleButton = document.getElementById('actionBtn');
let activeTab;

const renderButton = async (btn) => {
    await chrome.runtime.sendMessage({ request: "getActiveTab", fromFile: "popup-script.js" }, (response) => {
        activeTab = response.tab;
        console.log("getActiveTab response tab field from", response.fromFile, "-", activeTab);

        if (!activeTab.url.match(/^.+e-kreta\.hu.+Ertekeles.+$/)) {
            btn.disabled = true;
        }
    });
}

renderButton(toggleButton);

toggleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ request: 'autoGrade', tab: activeTab, fromFile: "popup-script.js" })
        .then((response) => {
            console.log("Response from tab: ", response);
        })
        .catch((error) => {
            console.error('Error sending autoGrade request:', error);
        });
    console.log("AutoGrade request sent to background. Data: ", { request: 'autoGrade', tab: activeTab, fromFile: "popup-script.js" });
});