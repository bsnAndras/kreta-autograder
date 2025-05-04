chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.fromFile === "popup-script.js") {
        switch (message.request) {
            case "getActiveTab": {
                console.log("getActiveTab request arrived from", message.fromFile)
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    sendResponse({ tab: tabs[0], fromFile: "background.js" });
                    console.log("Active tab info sent back to", message.fromFile, ":", tabs[0]);
                });
                break;
            };
            case "autoGrade": {
                console.log("AutoGrade request arrived from", message.fromFile);

                chrome.tabs.sendMessage(message.tab.id, { request: "autoGrade", fromFile: "background.js" })
                    .then((response) => {
                        sendResponse(`AutoGrade response from tab ${message.tab.id}: ${response}`);
                    })
                    .catch((error) => {
                        console.error('Error sending autoGrade request to tab:', message.tab, error);
                    });
            }
        }
    }
    return true; // Allow the callback to run, even if the message is not handled.
});