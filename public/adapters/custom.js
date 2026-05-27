// Generic adapter for any URL whose response contains an HTML <table>.
// Renders the first table found, columns auto-derived from <th> elements
// (or the first <tr> if no <thead>).

function parse(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const table = doc.querySelector("table");
  if (!table) return { columns: [], rows: [] };

  let headerCells = Array.from(table.querySelectorAll("thead th"));
  if (headerCells.length === 0) {
    const firstRow = table.querySelector("tr");
    headerCells = firstRow
      ? Array.from(firstRow.querySelectorAll("th, td"))
      : [];
  }

  const columns = headerCells.map((th, i) => ({
    key: `col${i}`,
    label: th.textContent.trim() || "",
    align: "left",
  }));

  const bodyRows = table.querySelectorAll("tbody tr").length
    ? table.querySelectorAll("tbody tr")
    : Array.from(table.querySelectorAll("tr")).slice(1);

  const rows = [];
  for (const tr of bodyRows) {
    const cells = tr.querySelectorAll("td");
    const row = {};
    cells.forEach((td, i) => {
      row[`col${i}`] = td.textContent.trim().replace(/\s+/g, " ");
    });
    if (Object.keys(row).length) rows.push(row);
  }
  return { columns, rows };
}

export default {
  id: "custom",
  name: "Custom URL",
  defaultUrl: "",
  broadcastSearch: "golf live",
  parse,
};
