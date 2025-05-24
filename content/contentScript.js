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

window.addEventListener("load", () => {
    console.log("window content loaded and ready.");
    
    // Check if the TanuloErtekelesGrid table fully rendered
    let tableBody = document.querySelector("table.TanuloErtekelesGrid tbody");
    while (!tableBody) {
        console.error("TanuloErtekelesGrid table's tbody tag not found.");
        setTimeout(() => {
            tableBody = document.querySelector("table.TanuloErtekelesGrid tbody");
        }, 1000);
    }
    
    console.log('tableBody:', tableBody);
    insertCheckboxes()
        .then(response => { console.log(response) })
        .catch(error => {
            console.error("Error inserting checkboxes:", error);
        });
});

// Function to insert checkboxes into the table
async function insertCheckboxes() {
    console.log("Inserting checkboxes into TanuloErtekelesGrid...");

    return new Promise((resolve, reject) => {

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
