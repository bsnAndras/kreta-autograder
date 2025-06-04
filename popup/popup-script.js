const toggleButton = document.getElementById('actionBtn');
const gradeSelector = document.getElementById('gradeSelector');
let activeTab;
let selectedGrade = "k.t";

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

gradeSelector.addEventListener('change', (event) => {
    selectedGrade = event.target.value;
});

toggleButton.addEventListener('click', () => {
    chrome.runtime.sendMessage({ request: 'autoGrade', tab: activeTab, grade: selectedGrade, fromFile: "popup-script.js" })
        .then((response) => {
            console.log("Response from tab: ", response);
        })
        .catch((error) => {
            console.error('Error sending autoGrade request:', error);
        });
    console.log("AutoGrade request sent to background. Data: ", { request: 'autoGrade', tab: activeTab, grade: selectedGrade, fromFile: "popup-script.js" });
});