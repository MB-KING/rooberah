const HOST = process.env.REACH_HOST ?? "rooberah.net";
const API = "https://check-host.net";
const POLL_MS = 3000;
const POLL_BUDGET_MS = 45000;
const OUTSIDE_SAMPLE = 8;

const checks = [
  { key: "ping", label: "ping", path: "/check-ping", host: HOST },
  { key: "tcp80", label: "tcp80", path: "/check-tcp", host: `${HOST}:80` },
  { key: "tcp443", label: "tcp443", path: "/check-tcp", host: `${HOST}:443` },
  { key: "https", label: "https", path: "/check-http", host: `https://${HOST}` }
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return response.json();
}

function pickNodes(catalog) {
  const entries = Object.entries(catalog.nodes ?? {});
  const iran = entries.filter(([, node]) => node.location?.[0] === "ir");
  const seen = new Set();
  const outside = [];
  for (const entry of entries) {
    const code = entry[1].location?.[0];
    if (!code || code === "ir" || seen.has(code)) continue;
    seen.add(code);
    outside.push(entry);
    if (outside.length >= OUTSIDE_SAMPLE) break;
  }
  return [...iran, ...outside].map(([id, node]) => ({
    id,
    country: node.location?.[0] ?? "",
    place: node.location?.[2] || node.location?.[1] || id,
    iran: node.location?.[0] === "ir"
  }));
}

function submitUrl(check, nodes) {
  const params = new URLSearchParams({ host: check.host });
  for (const node of nodes) params.append("node", node.id);
  return `${API}${check.path}?${params}`;
}

function pingOk(result) {
  const attempts = result?.[0];
  if (!Array.isArray(attempts)) return false;
  return attempts.some((row) => Array.isArray(row) && row[0] === "OK");
}

function tcpOk(result) {
  const row = result?.[0];
  return Boolean(row && !row.error && (row.address || row.time != null));
}

function httpsOk(result) {
  const row = result?.[0];
  const code = Number(row?.[3]);
  return row?.[0] === 1 && code >= 200 && code < 400;
}

function readOk(key, result) {
  if (result == null) return null;
  if (key === "ping") return pingOk(result);
  if (key === "https") return httpsOk(result);
  return tcpOk(result);
}

function detail(key, result) {
  if (result == null) return "pending";
  if (key === "ping") {
    const attempts = result?.[0];
    if (!Array.isArray(attempts)) return "no-data";
    const ok = attempts.filter((row) => row?.[0] === "OK").length;
    return `${ok}/${attempts.length}`;
  }
  if (key === "https") {
    const row = result?.[0];
    if (!row) return "no-data";
    return row[3] ? String(row[3]) : row[2] || "fail";
  }
  const row = result?.[0];
  if (!row) return "no-data";
  return row.error || `${Math.round((row.time ?? 0) * 1000)}ms`;
}

async function poll(requestId) {
  const deadline = Date.now() + POLL_BUDGET_MS;
  let last = {};
  while (Date.now() < deadline) {
    last = await getJson(`${API}/check-result/${requestId}`);
    const pending = Object.values(last).some((value) => value == null);
    if (!pending && Object.keys(last).length > 0) return last;
    await sleep(POLL_MS);
  }
  return last;
}

function tally(nodes, results) {
  const groups = {
    iran: { label: "ایران", ping: 0, tcp80: 0, tcp443: 0, https: 0, total: 0 },
    outside: { label: "خارج", ping: 0, tcp80: 0, tcp443: 0, https: 0, total: 0 }
  };
  for (const node of nodes) {
    const group = node.iran ? groups.iran : groups.outside;
    group.total += 1;
    for (const check of checks) {
      if (readOk(check.key, results[check.key]?.[node.id]) === true) {
        group[check.key] += 1;
      }
    }
  }
  return groups;
}

function lineFor(node, results) {
  const cells = checks.map((check) => {
    const value = results[check.key]?.[node.id];
    const ok = readOk(check.key, value);
    const mark = ok == null ? "?" : ok ? "ok" : "fail";
    return `${check.label}:${mark}(${detail(check.key, value)})`;
  });
  const ping = readOk("ping", results.ping?.[node.id]) === true;
  const https = readOk("https", results.https?.[node.id]) === true;
  const note = ping && !https ? " مسیر بسته" : "";
  return `${node.iran ? "IR" : node.country} ${node.place}  ${cells.join("  ")}${note}`;
}

async function main() {
  const catalog = await getJson(`${API}/nodes/hosts`);
  const nodes = pickNodes(catalog);
  if (!nodes.some((node) => node.iran)) {
    throw new Error("no Iran nodes in check-host catalog");
  }

  const submitted = {};
  await Promise.all(
    checks.map(async (check) => {
      const body = await getJson(submitUrl(check, nodes));
      if (!body.ok || !body.request_id) {
        throw new Error(`check-host rejected ${check.key}`);
      }
      submitted[check.key] = body;
    })
  );

  const results = {};
  await Promise.all(
    checks.map(async (check) => {
      results[check.key] = await poll(submitted[check.key].request_id);
    })
  );

  console.log(`host ${HOST}`);
  for (const check of checks) {
    console.log(`${check.label} ${submitted[check.key].permanent_link}`);
  }
  console.log("");
  for (const node of nodes) console.log(lineFor(node, results));

  const groups = tally(nodes, results);
  console.log("");
  for (const group of Object.values(groups)) {
    console.log(
      `${group.label}  n=${group.total}  ping=${group.ping}  tcp80=${group.tcp80}  tcp443=${group.tcp443}  https=${group.https}`
    );
  }

  const iran = groups.iran;
  if (iran.https === iran.total && iran.total > 0) {
    console.log("نتیجه: HTTPS از نودهای ایران این دور باز شد.");
  } else if (iran.ping > iran.https) {
    console.log(
      "نتیجه: پینگ ایران از HTTPS بیشتر است. مسیر تا صفحه بسته است و سایت از این شهرها باز نمی‌شود."
    );
  } else {
    console.log("نتیجه: HTTPS ایران کامل نیست.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
