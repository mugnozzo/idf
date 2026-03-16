const host = "http://localhost:3000";

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
