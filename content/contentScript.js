chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.request) {
        case "autoGrade": {
            console.log("autoGrade request arrived from", message.fromFile)
            autoGrade();
            sendResponse("Autograde completed.");
            break;
        };
        default:
            console.error(`Unknown request: ${message.request}`);
            sendResponse(`Unknown request received from ${message.fromFile}. Message: ${message}`);
    }
    return true;
});

async function autoGrade() {
    console.log("Autograding started...");
    const studentList = document.querySelectorAll(".TanuloErtekelesGrid .k-master-row");
    if (studentList.length > 0) {
        try {
            for (const studentRow of studentList) {
                await editRow(studentRow)
                    .then(response => console.log(response));
            }
        } catch (error) {
            console.error('Error autograding student:', error);
        }
        console.log("Autograde completed.");
    } else {
        console.log("No students found to autograde.");
    }
}

async function editRow(row) {
    return new Promise((resolve, reject) => {
        const studentName = row.children[2].querySelector('a').dataset.tanulonev;
        let grade;

        console.log(`Editing ${studentName}...`);
        // open the edit dialog
        row.querySelector('.rowFunction a').click();
        setTimeout(() => {
            // select dropdown menu for grade selection
            document.querySelector('#TanuloErtekelesMondatbankItemSelectForm .k-dropdown-wrap .k-select>span').click();

            //find the "kiv. telj." option
            const gradingsList = document.querySelectorAll('#MondatbankSelectPopupId_listbox li.k-item');
            gradingsList.forEach((gradeOption) => {
                if (gradeOption.textContent.match(/^kiv.+$/)) {
                    grade = gradeOption.textContent;
                    gradeOption.click();
                    return;
                }
            });

            //submit
            document.querySelector('#ErtekelesMondatbankSelectPopupSelectButton').click();
            if (grade) {
                resolve(`${studentName} has been autograded. Grade selected: ${grade}`);
            } else {
                reject('No grade selected.');
            }
        }, 500)
    });
}
