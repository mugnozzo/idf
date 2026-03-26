const host = "http://localhost:3000";

const getTypesButton = document.getElementById("get-types-button");
const getStatusesButton = document.getElementById("get-statuses-button");
const getTagsButton = document.getElementById("get-tags-button");
const getElementsButton = document.getElementById("get-elements-button");

function listsClick () {
  getTypesButton.click();
  getStatusesButton.click();
  getTagsButton.click();
  getElementsButton.click();
}

// Setup clicks on GET buttons
document.querySelectorAll(".get-button").forEach( function(value) {
  value.addEventListener("click", function () {
    const endpoint = this.dataset.endpoint;
    const result = document.getElementById(this.dataset.result);
    apiRequest(host+"/api/" + endpoint, 'GET', {})
      .then(data => {
        result.innerHTML = "";
        const table = document.createElement("table");
        for (const line of data) {
          const tr = document.createElement("tr");
          for (const field in line) {
            const td = document.createElement("td");
            td.innerHTML = line[field];
            tr.appendChild(td);
          }
          table.appendChild(tr);
        }
        result.appendChild(table);
      })
      .catch(error => console.error(error));
  });
});

// Element POST
const postElementsButton = document.getElementById("post-elements-button");
postElementsButton.addEventListener("click", function() {
  const name = document.getElementById("post-elements-name").value;
  const type = Number(document.getElementById("post-elements-type").value);
  const status = Number(document.getElementById("post-elements-status").value);
  const result = document.getElementById("post-elements-result");
  apiRequest(host+"/api/elements", 'POST', {name, type, status})
    .then(data => {
      console.log(data);
      result.innerHTML = "";
      const div = document.createElement("div");
      const tr = document.createElement("tr");
      for (const field in data) {
        const td = document.createElement("td");
        td.innerHTML = data[field];
        tr.appendChild(td);
      }
      div.appendChild(tr);
      result.appendChild(div);
      listsClick();
    })
    .catch(error => console.error(error));
});
