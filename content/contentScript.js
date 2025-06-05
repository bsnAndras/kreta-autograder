chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.request) {
        case "autoGrade": {
            console.log("autoGrade request arrived:", message)
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

const tableBodyObserver = new MutationObserver(handleTableMutation);

function handleTableMutation(mutations, observer) {
    let tableContentChanged = false;
    // console.log('mutations', mutations)

    for (const mutation of mutations) {
        if (mutation.type === 'childList' && !tableContentChanged) {
            console.log("Table mutation detected.");
            tableContentChanged = true;
        }
    };

    if (tableContentChanged) {
        // console.log("Disconnecting observer.");
        observer.disconnect();

        insertGradingCheckboxes() //observer will be reconnected after the checkboxes are inserted in this method
            .then(response => { console.log(response) })
            .catch(error => {
                console.error("Error inserting checkboxes:", error);
            })
    }
}

window.addEventListener("load", () => {
    // console.log("window content loaded and ready.");

    // Check if the TanuloErtekelesGrid table fully rendered
    let tableBody = document.querySelector("table.TanuloErtekelesGrid tbody"); //TODO: something is going on at the table colgroup styling. The columns are off
    let iterationCount = 0;
    const intervalID = setInterval(() => {
        iterationCount++;
        tableBody = document.querySelector("table.TanuloErtekelesGrid tbody");

        if (tableBody) {
            clearInterval(intervalID);
            //Check for table mutation
            tableBodyObserver.observe(tableBody, { childList: true, subtree: true });
            console.log('tableBody:', tableBody);
        } else if (iterationCount > 10) {
            clearInterval(intervalID);
            console.error("TanuloErtekelesGrid table's tbody tag not found.");
            return;
        } else {
            console.error("TanuloErtekelesGrid table's tbody tag not found. Retrying...");
        }
    }, 500);
});

// Function to insert checkboxes into the table
async function insertGradingCheckboxes() {
    console.log("Inserting checkboxes into TanuloErtekelesGrid...");

    return new Promise((resolve, reject) => {

        const table = document.querySelector("table.TanuloErtekelesGrid");
        if (!table) {
            console.error("TanuloErtekelesGrid table not found.");
            reject("TanuloErtekelesGrid table not found.");
            return;
        }

        const colgroup = table.querySelector("colgroup");
        if (!colgroup) {
            console.warn("Colgroup not found in TanuloErtekelesGrid table.");
            return;
        }

        if (!colgroup.querySelector("col.auto-grade-col")) {
            const autoGradeCol = document.createElement("col");
            autoGradeCol.className = "auto-grade-col";
            colgroup.appendChild(autoGradeCol);
        }

        const headerRow = table.querySelector("thead tr");
        if (!headerRow) {
            console.error("Header row not found in TanuloErtekelesGrid table.");
            reject("Header row not found in TanuloErtekelesGrid table.");
            return;
        }


        // // Create a new header cell for the checkbox
        if (!headerRow.querySelector(".auto-grade-cell")) {
            const checkboxHeaderCell = document.createElement("th");
            checkboxHeaderCell.id = "select-all-checkbox-cell";
            checkboxHeaderCell.className = "auto-grade-cell";
            const gradingBlock = createGradingBlock();
            checkboxHeaderCell.appendChild(gradingBlock);
            headerRow.insertAdjacentElement("beforeend", checkboxHeaderCell);
        }

        // Add checkboxes to each student row
        const studentRows = table.querySelectorAll(".k-master-row");
        studentRows.forEach(row => {
            if (!row.querySelector(".auto-grade-cell")) {
                const checkboxCell = document.createElement("td");
                checkboxCell.className = "auto-grade-cell";
                const gradingBlock = createGradingBlock();
                checkboxCell.appendChild(gradingBlock);
                row.insertAdjacentElement("beforeend", checkboxCell);
            }
        });

        // Add event listener to the "Select All" checkbox
        const selectAllCheckboxWrapper = document.querySelector("#select-all-checkbox-cell div.auto-grade-wrapper");
        if (selectAllCheckboxWrapper) {

            selectAllCheckboxWrapper.querySelectorAll("input.auto-grade-checkbox").forEach(selectAllCheckbox => {

                selectAllCheckbox.addEventListener("change", (event) => {
                    const isChecked = event.target.checked;
                    const tbodyCheckboxes = document.querySelectorAll("table.TanuloErtekelesGrid .k-master-row input.auto-grade-checkbox");

                    tbodyCheckboxes.forEach(checkbox => {
                        if (checkbox.dataset.gradeId === selectAllCheckbox.dataset.gradeId) {
                            checkbox.checked = isChecked;
                        } else {
                            checkbox.checked = false;
                        }
                    });
                });
            });

        } else {
            console.warn("Select all checkbox cell not found.");
        }

        if (document.querySelectorAll("table.TanuloErtekelesGrid input.auto-grade-checkbox").length > 1) {
            resolve("Checkboxes inserted successfully.");
        } else {
            reject("Failed to insert checkboxes.");
        }

        tableBodyObserver.observe(table.querySelector("tbody"), { childList: true, subtree: true });
    });
}

function createGradingBlock() {
    const gradingBlock = document.createElement("div");
    gradingBlock.className = "auto-grade-wrapper";
    const gradingOptions = ['k.t', 'j.t', 'm.t', 'f', 'o.f', 'n.é'];

    // Create the checkboxes
    for (let i = 0; i < 6; i++) {
        const gradingTile = document.createElement("label");
        gradingTile.className = "auto-grade-tile";
        gradingTile.textContent = gradingOptions[i];
        gradingTile.innerHTML += `<input type="checkbox" class="auto-grade-checkbox" data-grade-id="${gradingOptions[i]}">`;
        gradingBlock.appendChild(gradingTile);
        const checkbox = gradingTile.querySelector("input.auto-grade-checkbox");
        checkbox.addEventListener("change", (event) => {
            const isChecked = event.target.checked;
            if (isChecked) {
                // Uncheck all other checkboxes in the same grading block
                const otherCheckboxes = gradingBlock.querySelectorAll("input.auto-grade-checkbox");
                otherCheckboxes.forEach(otherCheckbox => {
                    if (otherCheckbox !== checkbox) {
                        otherCheckbox.checked = false;
                    }
                });
            }
        })
    }

    return gradingBlock;
}

// Function to automatically grade students in the TanuloErtekelesGrid
async function autoGrade() {
    console.log("Autograding started...");
    const studentList = document.querySelectorAll(".TanuloErtekelesGrid .k-master-row");
    const selectedStudents = document.querySelectorAll(".TanuloErtekelesGrid .k-master-row:has(input.auto-grade-checkbox:checked)");
    if (selectedStudents.length > 0) {
        try {
            for (const studentRow of selectedStudents) {
                const gradeId = studentRow.querySelector("input.auto-grade-checkbox:checked").dataset.gradeId;
                await editRow(studentRow, gradeId)
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

async function editRow(row, gradeId) {
    return new Promise((resolve, reject) => {
        const studentName = row.children[2].querySelector('a').dataset.tanulonev;
        let grade = {
            id: gradeId,
            textContent: undefined,
            element: undefined
        };

        console.log(`Editing ${studentName}...`);
        // open the edit dialog
        row.querySelector('.rowFunction a').click();
        setTimeout(() => {
            // select dropdown menu for grade selection
            document.querySelector('#TanuloErtekelesMondatbankItemSelectForm .k-dropdown-wrap .k-select>span').click();

            //find the selected option and select the grade
            grade = findGradeOption(gradeId);
            grade.element.click();

            //submit
            document.querySelector('#ErtekelesMondatbankSelectPopupSelectButton').click();
            if (grade.textContent) {
                resolve(`${studentName} has been autograded. Grade selected: ${grade.textContent}`);
            } else {
                reject('No grade selected.');
            }
        }, 500)
    });
}

function findGradeOption(gradeId) {
    gradingTable = new Map(
        [
            ["k.t", { regex: /^.*kiv.+$/, text: "kiv - kiválóan teljesített" }],
            ["j.t", { regex: /^.*jól.+$/, text: "j.t - jól teljesített" }],
            ["m.t", { regex: /^.+megf.+$/, text: "m.t - megfelelően teljesített" }],
            ["f", { regex: /^.*felz.+$/, text: "f - felzárkózásra szorul" }],
            ["o.f", { regex: /^.+folyt.+$/, text: "o.f - osztályát folytatja" }],
            ["n.é", { regex: /^(n\.é)|(.*[n,N]em).+$/, text: "n.é - Nem értékelhető" }]
        ]
    )

    const grade = {
        id: gradeId,
        regex: gradingTable.get(gradeId).regex,
        textContent: gradingTable.get(gradeId).text,
        element: undefined
    }

    const gradeOptions = document.querySelectorAll('#MondatbankSelectPopupId_listbox li.k-item');
    for (const option of gradeOptions) {
        if (option.textContent.match(grade.regex)) {
            grade.textContent = option.textContent;
            grade.element = option;
            console.log(`Grade option found: ${grade}`);
            return { gradeId, textContent: grade.textContent, element: grade.element };
        }
    }
    console.error(`Grade option of "${gradeId}" not found.`);
    return { gradeId, textContent: grade.textContent, element: grade.element };
}