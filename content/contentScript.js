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

const observer = new MutationObserver((mutations) => {
    let tableContentChanged = false;
    console.log('mutations', mutations)
    let i = 0;
    for (const mutation of mutations) {
        console.log('iter:', i++);
        if (mutation.type === 'childList') {
            console.log("Table mutation detected.");
            tableContentChanged = true;
        }
    };

    if (tableContentChanged) {
        console.log("Disconnecting observer.");
        observer.disconnect(); //TODO: need to reapply observer after content change, otherwise reload is needed after every group grading

        insertCheckboxes({ signal: AbortSignal.timeout(5000) })
            .then(response => { console.log(response) })
            .catch(error => {
                console.error("Error inserting checkboxes:", error);
            });
    }
});

window.addEventListener("load", () => { //TODO: should be page specific, it can break on other pages
    console.log("window content loaded and ready.");

    // Check if the TanuloErtekelesGrid table fully rendered
    let tableBody = document.querySelector("table.TanuloErtekelesGrid tbody"); //TODO: something is going on at the table colgroup styling. The columns are off
    while (!tableBody) {
        console.error("TanuloErtekelesGrid table's tbody tag not found.");
        setTimeout(() => {
            tableBody = document.querySelector("table.TanuloErtekelesGrid tbody");
        }, 1000);
    }
    
    //Check for table mutation
    observer.observe(tableBody, { childList: true, subtree: true });
    console.log('tableBody:', tableBody);
});

// Function to insert checkboxes into the table
async function insertCheckboxes({ signal }) {
    console.log("Inserting checkboxes into TanuloErtekelesGrid...");

    return new Promise((resolve, reject) => {
        if (signal && signal.aborted) {
            console.warn("Checkbox insertion aborted by signal at start of insertion process.");
            reject(signal.reason);
            return;
        }
        
        signal.addEventListener('abort', () => {
            console.warn("Checkbox insertion aborted.");
            reject(signal.reason || "Checkbox insertion aborted.");
        });

        const table = document.querySelector("table.TanuloErtekelesGrid");
        if (!table) {
            console.error("TanuloErtekelesGrid table not found.");
            reject("TanuloErtekelesGrid table not found.");
            return;
        }

        const headerRow = table.querySelector("tr");
        if (!headerRow) {
            console.error("Header row not found in TanuloErtekelesGrid table.");
            reject("Header row not found in TanuloErtekelesGrid table.");
            return;
        }

        // Create a new header cell for the checkbox
        const checkboxHeaderCell = document.createElement("th");
        checkboxHeaderCell.innerHTML = '<input type="checkbox" id="selectAllCheckbox" class="auto-grade-checkbox">';
        headerRow.insertBefore(checkboxHeaderCell, headerRow.firstChild);
        console.log("Checkbox header cell added.");

        // Add checkboxes to each student row
        const studentRows = table.querySelectorAll(".k-master-row");
        console.log('studentRows:', studentRows)
        studentRows.forEach(row => {
            const checkboxCell = document.createElement("td");
            checkboxCell.innerHTML = '<input type="checkbox" class="auto-grade-checkbox">';
            row.insertBefore(checkboxCell, row.firstChild);
            console.log("Checkbox added to student row:", row);
        });
        
        // Add event listener to the "Select All" checkbox
        const selectAllCheckbox = document.getElementById("selectAllCheckbox");
        selectAllCheckbox.addEventListener("change", (event) => {
            const isChecked = event.target.checked;
            const checkboxes = document.querySelectorAll("table.TanuloErtekelesGrid .k-master-row input.auto-grade-checkbox");
            checkboxes.forEach(checkbox => {
                checkbox.checked = isChecked;
            });
        });

        if(document.querySelectorAll("table.TanuloErtekelesGrid .k-master-row input.auto-grade-checkbox").length > 1) {
            signal.removeEventListener('abort', () => {});
            resolve("Checkboxes inserted successfully.");
        }
    });
}

// Function to automatically grade students in the TanuloErtekelesGrid
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
