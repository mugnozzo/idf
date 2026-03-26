const host = "http://localhost:3000";

const state = {
  types: [],
  statuses: [],
  tags: [],
  elements: [],
  filters: {
    search: "",
    type: "",
    status: "",
    tag: "",
  },
};

const elementsList = document.getElementById("elements-list");
const resultsSummary = document.getElementById("results-summary");
const globalFeedback = document.getElementById("global-feedback");

const createForm = document.getElementById("create-element-form");
const createButton = document.getElementById("create-element-button");
const refreshButton = document.getElementById("refresh-button");
const clearFiltersButton = document.getElementById("clear-filters-button");

const elementNameInput = document.getElementById("element-name");
const elementTypeSelect = document.getElementById("element-type");
const elementStatusSelect = document.getElementById("element-status");
const elementTagsSelect = document.getElementById("element-tags");

const searchInput = document.getElementById("search-input");
const filterTypeSelect = document.getElementById("filter-type");
const filterStatusSelect = document.getElementById("filter-status");
const filterTagSelect = document.getElementById("filter-tag");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTimestamp(value) {
  if (!value) return "—";

  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function showFeedback(message, kind = "success") {
  globalFeedback.textContent = message;
  globalFeedback.classList.remove("hidden", "success", "error");
  globalFeedback.classList.add(kind);
}

function hideFeedback() {
  globalFeedback.textContent = "";
  globalFeedback.classList.add("hidden");
  globalFeedback.classList.remove("success", "error");
}

function setSelectOptions(select, items, {
  includeEmpty = false,
  emptyLabel = "All",
} = {}) {
  select.innerHTML = "";

  if (includeEmpty) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = emptyLabel;
    select.appendChild(emptyOption);
  }

  for (const item of items) {
    const option = document.createElement("option");
    option.value = String(item.id);
    option.textContent = item.name;
    select.appendChild(option);
  }
}

function getSelectedValues(select) {
  return Array.from(select.selectedOptions).map(option => Number(option.value));
}

function getTypeName(typeId) {
  const found = state.types.find(type => Number(type.id) === Number(typeId));
  return found ? found.name : `#${typeId}`;
}

function getStatusName(statusId) {
  const found = state.statuses.find(status => Number(status.id) === Number(statusId));
  return found ? found.name : `#${statusId}`;
}

function getElementTags(element) {
  if (Array.isArray(element.tags)) {
    return element.tags;
  }

  return [];
}

async function loadLookups() {
  const [types, statuses, tags] = await Promise.all([
    apiRequest(`${host}/api/types`),
    apiRequest(`${host}/api/statuses`),
    apiRequest(`${host}/api/tags`),
  ]);

  state.types = types;
  state.statuses = statuses;
  state.tags = tags;

  setSelectOptions(elementTypeSelect, state.types);
  setSelectOptions(elementStatusSelect, state.statuses);
  setSelectOptions(elementTagsSelect, state.tags);

  setSelectOptions(filterTypeSelect, state.types, {
    includeEmpty: true,
    emptyLabel: "All types",
  });
  setSelectOptions(filterStatusSelect, state.statuses, {
    includeEmpty: true,
    emptyLabel: "All statuses",
  });
  setSelectOptions(filterTagSelect, state.tags, {
    includeEmpty: true,
    emptyLabel: "All tags",
  });
}

async function loadElements() {
  const elements = await apiRequest(`${host}/api/elements`);

  const withTags = await Promise.all(
    elements.map(async element => {
      try {
        return await apiRequest(`${host}/api/elements/${element.id}`);
      } catch (error) {
        console.error(`Failed to load element ${element.id}`, error);
        return { ...element, tags: [] };
      }
    })
  );

  state.elements = withTags;
}

function getFilteredElements() {
  return state.elements.filter(element => {
    const matchesSearch = !state.filters.search || element.name
      .toLowerCase()
      .includes(state.filters.search.toLowerCase());

    const matchesType = !state.filters.type || String(element.type) === state.filters.type;
    const matchesStatus = !state.filters.status || String(element.status) === state.filters.status;

    const tags = getElementTags(element);
    const matchesTag = !state.filters.tag || tags.some(tag => String(tag.id) === state.filters.tag);

    return matchesSearch && matchesType && matchesStatus && matchesTag;
  });
}

function renderElements() {
  const filteredElements = getFilteredElements();
  const total = state.elements.length;
  const shown = filteredElements.length;

  resultsSummary.textContent = `${shown} shown${shown !== total ? ` / ${total} total` : ""}`;

  if (shown === 0) {
    elementsList.innerHTML = `
      <div class="empty-state">
        <p>No elements match the current filters.</p>
      </div>
    `;
    return;
  }

  elementsList.innerHTML = filteredElements
    .map(element => {
      const tags = getElementTags(element);
      const tagsHtml = tags.length > 0
        ? tags.map(tag => `<span class="chip">${escapeHtml(tag.name)}</span>`).join("")
        : `<span class="chip">No tags</span>`;

      return `
        <article class="card">
          <div class="card-header">
            <h3 class="card-title">${escapeHtml(element.name)}</h3>
            <span class="card-id">#${element.id}</span>
          </div>

          <div class="meta-row"><strong>Type:</strong> ${escapeHtml(getTypeName(element.type))}</div>
          <div class="meta-row"><strong>Status:</strong> ${escapeHtml(getStatusName(element.status))}</div>
          <div class="meta-row"><strong>Created:</strong> ${escapeHtml(formatTimestamp(element.created_at))}</div>
          <div class="meta-row"><strong>Modified:</strong> ${escapeHtml(formatTimestamp(element.modified_at))}</div>

          <div class="chips">${tagsHtml}</div>
        </article>
      `;
    })
    .join("");
}

function syncFiltersFromUi() {
  state.filters.search = searchInput.value.trim();
  state.filters.type = filterTypeSelect.value;
  state.filters.status = filterStatusSelect.value;
  state.filters.tag = filterTagSelect.value;
}

function resetCreateForm() {
  createForm.reset();

  if (elementTagsSelect.options.length > 0) {
    Array.from(elementTagsSelect.options).forEach(option => {
      option.selected = false;
    });
  }
}

async function refreshApp({ showMessage = false } = {}) {
  hideFeedback();
  await Promise.all([loadLookups(), loadElements()]);
  renderElements();

  if (showMessage) {
    showFeedback("Data refreshed.", "success");
  }
}

createForm.addEventListener("submit", async event => {
  event.preventDefault();
  hideFeedback();

  const name = elementNameInput.value.trim();
  const type = Number(elementTypeSelect.value);
  const status = Number(elementStatusSelect.value);
  const tagIds = getSelectedValues(elementTagsSelect);

  if (!name) {
    showFeedback("Name is required.", "error");
    elementNameInput.focus();
    return;
  }

  createButton.disabled = true;
  createButton.textContent = "Creating...";

  try {
    await apiRequest(`${host}/api/elements`, "POST", {
      name,
      type,
      status,
      tagIds,
    });

    resetCreateForm();
    await loadElements();
    renderElements();
    showFeedback("Element created.", "success");
  } catch (error) {
    console.error(error);
    showFeedback(error.message || "Failed to create element.", "error");
  } finally {
    createButton.disabled = false;
    createButton.textContent = "Create element";
  }
});

searchInput.addEventListener("input", () => {
  syncFiltersFromUi();
  renderElements();
});

filterTypeSelect.addEventListener("change", () => {
  syncFiltersFromUi();
  renderElements();
});

filterStatusSelect.addEventListener("change", () => {
  syncFiltersFromUi();
  renderElements();
});

filterTagSelect.addEventListener("change", () => {
  syncFiltersFromUi();
  renderElements();
});

clearFiltersButton.addEventListener("click", () => {
  searchInput.value = "";
  filterTypeSelect.value = "";
  filterStatusSelect.value = "";
  filterTagSelect.value = "";
  syncFiltersFromUi();
  renderElements();
});

refreshButton.addEventListener("click", async () => {
  refreshButton.disabled = true;
  refreshButton.textContent = "Refreshing...";

  try {
    await refreshApp({ showMessage: true });
  } catch (error) {
    console.error(error);
    showFeedback(error.message || "Failed to refresh data.", "error");
  } finally {
    refreshButton.disabled = false;
    refreshButton.textContent = "Refresh";
  }
});

async function init() {
  elementsList.innerHTML = `
    <div class="empty-state">
      <p>Loading your elements...</p>
    </div>
  `;

  try {
    await refreshApp();
  } catch (error) {
    console.error(error);
    showFeedback(error.message || "Failed to initialize the app.", "error");
    elementsList.innerHTML = `
      <div class="empty-state">
        <p>Could not load the application data.</p>
      </div>
    `;
  }
}

init();
