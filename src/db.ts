import fs from "fs";
import path from "path";

// Define TypeScript interfaces matching App.tsx expectation
export interface FeedItem {
  name: string;
  url: string;
}

export interface ArticleItem {
  id: string;
  title: string;
  feed_url: string | null;
  source_domain: string;
  published_date: string | null;
  ingestion_status: string;
  clearance_level: string;
  tags: string[];
  content?: string;
  created_at: string | null;
  // NLP Enhancements
  entities?: Array<{ name: string; type: string }>;
  keywords?: string[];
  topic?: string;
  sentiment?: string;
  policy_tags?: string[];
  risk_level?: string;
  classification_priority?: string;
}

export interface ReportItem {
  id: string;
  title: string;
  summary: string;
  findings: Array<{ claim: string; evidence: string[] }>;
  contradictions: Array<{ conflict: string; sources: string[] }>;
  confidence: number;
  created_at: string | null;
  status: string; // "pending" | "approved" | "rejected"
  reviewer_feedback: string | null;
  reviewer_notes?: string;
  reviewer_name?: string;
  policy_impact?: string;
  threat_assessment?: string;
  recommendations?: string;
  citations?: Array<{ text: string; source_id: string }>;
}

export interface JobItem {
  id: string;
  type: string;
  status: string;
  progress: number;
  log_message: string;
  started_at: string;
  completed_at: string | null;
}

export interface AuditLogItem {
  id: number;
  action: string;
  user_id: string;
  detail: string;
  timestamp: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
}

export interface GraphLink {
  source: string;
  target: string;
  predicate: string;
  confidence: number;
  evidence: string[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface DbState {
  feeds: FeedItem[];
  articles: ArticleItem[];
  reports: ReportItem[];
  jobs: JobItem[];
  auditLogs: AuditLogItem[];
  graph: GraphData;
}

const DB_PATH = path.join(process.cwd(), "data", "local_db.json");

// Helper to ensure data directory exists
function ensureDirExists() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// In-memory cache + file storage
let state: DbState | null = null;

const INITIAL_FEEDS: FeedItem[] = [
  { name: "CISA Cybersecurity Alerts", url: "https://www.cisa.gov/cybersecurity-alerts/alerts.xml" },
  { name: "SANS Internet Storm Center", url: "https://isc.sans.edu/rssfeed.xml" },
  { name: "Kaspersky Securelist RSS", url: "https://securelist.com/feed/" },
  { name: "Talos Intelligence Threat Blog", url: "https://blog.talosintelligence.com/feeds/posts/default" }
];

const INITIAL_ARTICLES: ArticleItem[] = [
  {
    id: "art-cisa-2026-001",
    title: "APT41 Active Exploitation of Edge VPN and Router Gateways",
    feed_url: "https://www.cisa.gov/cybersecurity-alerts/alerts.xml",
    source_domain: "www.cisa.gov",
    published_date: "2026-07-10T12:00:00Z",
    ingestion_status: "ready",
    clearance_level: "unclassified",
    tags: ["APT41", "Zero-day", "VPN", "Edge-Devices"],
    content: "CISA has observed active exploitation of zero-day vulnerabilities in enterprise edge gateways and VPN systems. Threat actor APT41, a China-nexus cyber espionage group, is actively compromising these systems to establish initial access. The group deploys bespoke web shells, custom backdoors, and resides long-term within internal subnetting networks. Recommended mitigations include immediate firmware updates, strict firewall filtering, and rotating credential certificates on compromised edge routers.",
    created_at: "2026-07-11T00:00:00Z",
    entities: [
      { name: "APT41", type: "Threat Actor" },
      { name: "CISA", type: "Government Agency" },
      { name: "VPN", type: "Protocol/Technology" },
      { name: "Edge Gateways", type: "Infrastructure" }
    ],
    keywords: ["exploitation", "zero-day", "vpn", "gateways", "backdoors"],
    topic: "Edge Network Exploitation",
    sentiment: "Highly Threatening / Active Alert",
    policy_tags: ["NIST-800-53-SI-4", "ISO-27001-A.12.6"],
    risk_level: "Critical",
    classification_priority: "High"
  },
  {
    id: "art-sans-2026-002",
    title: "Volt Typhoon Stealth Operations inside US Critical Infrastructure",
    feed_url: "https://isc.sans.edu/rssfeed.xml",
    source_domain: "isc.sans.edu",
    published_date: "2026-07-09T18:30:00Z",
    ingestion_status: "ready",
    clearance_level: "secret",
    tags: ["Volt-Typhoon", "Critical-Infrastructure", "Living-off-the-Land"],
    content: "SANS analysts report pre-positioning activities attributed to Volt Typhoon targeting power grids, water treatment facilities, and transport nodes. The actor utilizes 'Living off the Land' (LotL) binaries like wmic, powershell, and certutil to blend in with normal administrative traffic. They rely heavily on compromised SOHO routers as VPN proxies (KV-proxy network) to obscure originating IP addresses. Detectable indicators are extremely rare, necessitating deep credential auditing and anomalous active hours checks.",
    created_at: "2026-07-11T00:05:00Z",
    entities: [
      { name: "Volt Typhoon", type: "Threat Actor" },
      { name: "SANS", type: "Research Group" },
      { name: "Power Grids", type: "Critical Infrastructure" },
      { name: "SOHO routers", type: "Hardware Device" }
    ],
    keywords: ["pre-positioning", "living-off-the-land", "stealth", "infrastructure"],
    topic: "Critical Infrastructure Targeting",
    sentiment: "Adversarial pre-positioning suspected",
    policy_tags: ["NIST-800-53-AC-2", "NIST-800-53-SI-4"],
    risk_level: "High",
    classification_priority: "High"
  },
  {
    id: "art-kaspersky-2026-003",
    title: "XZ Utils Backdoor (CVE-2024-3094) Analysis and Mitigation",
    feed_url: "https://securelist.com/feed/",
    source_domain: "securelist.com",
    published_date: "2026-07-08T09:15:00Z",
    ingestion_status: "ready",
    clearance_level: "confidential",
    tags: ["XZ-Utils", "Backdoor", "Supply-Chain", "CVE-2024-3094"],
    content: "A detailed analysis of the sophisticated multi-stage backdoor discovered in XZ Utils. The compromise represents a highly coordinated supply-chain operation span over multiple years. The backdoor targets liblzma within sshd to execute arbitrary code before public authentication. The attacker, operating under the alias Jia Tan, slowly gained trust and introduced highly obfuscated test files containing malicious payloads during the build process.",
    created_at: "2026-07-11T00:10:00Z",
    entities: [
      { name: "Jia Tan", type: "Threat Actor Persona" },
      { name: "CVE-2024-3094", type: "Vulnerability CVE" },
      { name: "XZ Utils", type: "Software Component" },
      { name: "liblzma", type: "Library Module" }
    ],
    keywords: ["backdoor", "supply-chain", "obfuscation", "sshd"],
    topic: "Supply Chain Integrity & Backdoors",
    sentiment: "Severe Supply Chain Contamination",
    policy_tags: ["NIST-800-53-SA-12", "ISO-27001-A.15.1"],
    risk_level: "Critical",
    classification_priority: "High"
  }
];

const INITIAL_REPORTS: ReportItem[] = [
  {
    id: "rep-001",
    title: "Comprehensive Intelligence Brief: Edge Network Gateways Under Siege",
    summary: "This synthesized report compiles findings on APT41 and Volt Typhoon target patterns across enterprise networks. Edge VPN routers, firewalls, and small office routers are currently the primary attack vector for national-tier threat actors. They utilize these devices to bypass standard endpoint detection and response (EDR) solutions, creating persistent channels for subsequent network intrusion.",
    findings: [
      { claim: "APT41 leverages zero-day VPN exploits for initial entry.", evidence: ["art-cisa-2026-001"] },
      { claim: "Volt Typhoon uses residential SOHO proxies to mask operational sources.", evidence: ["art-sans-2026-002"] },
      { claim: "Vulnerable edge routing devices are heavily targeted due to lack of EDR capability.", evidence: ["art-cisa-2026-001", "art-sans-2026-002"] }
    ],
    contradictions: [
      { conflict: "Initial entry vector of Volt Typhoon is rumored as phishing vs. edge exploits.", sources: ["art-sans-2026-002"] }
    ],
    confidence: 0.94,
    created_at: "2026-07-11T00:15:00Z",
    status: "published",
    reviewer_feedback: null
  }
];

const INITIAL_GRAPH: GraphData = {
  nodes: [
    { id: "apt41", label: "APT41", type: "Threat Actor" },
    { id: "healthcare_sector", label: "Healthcare Sector", type: "Sector Target" },
    { id: "volt_typhoon", label: "Volt Typhoon", type: "Threat Actor" },
    { id: "critical_infrastructure", label: "Critical Infrastructure", type: "Sector Target" },
    { id: "united_states", label: "United States", type: "Affected Country" },
    { id: "cyber_espionage", label: "Cyber Espionage Campaign", type: "Campaign Type" },
    { id: "government_sector", label: "Government Sector", type: "Sector Target" }
  ],
  links: [
    { source: "apt41", target: "healthcare_sector", predicate: "TARGETS", confidence: 0.95, evidence: ["art-cisa-2026-001"] },
    { source: "volt_typhoon", target: "critical_infrastructure", predicate: "TARGETS", confidence: 0.98, evidence: ["art-sans-2026-002"] },
    { source: "volt_typhoon", target: "united_states", predicate: "OPERATES_IN", confidence: 0.92, evidence: ["art-sans-2026-002"] },
    { source: "cyber_espionage", target: "government_sector", predicate: "TARGETS", confidence: 0.99, evidence: ["art-kaspersky-2026-003"] }
  ]
};

const INITIAL_JOBS: JobItem[] = [
  {
    id: "job-boot-001",
    type: "rss_ingest",
    status: "success",
    progress: 100,
    log_message: "System startup RSS ingestion successfully pulled 3 articles from Talos, SANS, and CISA.",
    started_at: "2026-07-11T00:00:00Z",
    completed_at: "2026-07-11T00:02:00Z"
  }
];

const INITIAL_AUDIT_LOGS: AuditLogItem[] = [
  {
    id: 1,
    action: "system_startup",
    user_id: "system",
    detail: "PIAP Coordinated Platform Threat Intelligence Server initialization.",
    timestamp: "2026-07-11T00:00:00Z"
  },
  {
    id: 2,
    action: "rss_poll_completed",
    user_id: "system",
    detail: "Finished periodic RSS poll across 4 feeds. Registered 3 threat articles.",
    timestamp: "2026-07-11T00:02:00Z"
  }
];

export function getDb(): DbState {
  if (state) return state;

  ensureDirExists();
  if (fs.existsSync(DB_PATH)) {
    try {
      const content = fs.readFileSync(DB_PATH, "utf-8");
      state = JSON.parse(content);
      // Migrate old technical graph nodes to new real-world entities
      if (state && state.graph && state.graph.nodes && state.graph.nodes.some(n => n.id === "edge_vpn")) {
        state.graph = INITIAL_GRAPH;
        saveDb(state);
      }
      return state!;
    } catch (e) {
      console.error("Failed to parse local_db.json, recreating with initial state:", e);
    }
  }

  // Create initial state
  state = {
    feeds: INITIAL_FEEDS,
    articles: INITIAL_ARTICLES,
    reports: INITIAL_REPORTS,
    jobs: INITIAL_JOBS,
    auditLogs: INITIAL_AUDIT_LOGS,
    graph: INITIAL_GRAPH
  };
  saveDb(state);
  return state;
}

export function saveDb(newState: DbState) {
  state = newState;
  ensureDirExists();
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), "utf-8");
}

export function addArticle(title: string, content: string, clearance: string, source: string = "manual_upload", tags: string[] = ["manually_uploaded"]) {
  const db = getDb();
  const id = `art-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Rule-based NLP extraction
  const lowerTitle = title.toLowerCase();
  const lowerContent = content.toLowerCase();

  // Entities
  const entities: Array<{ name: string; type: string }> = [];
  if (/apt\d+/i.test(content)) {
    const match = content.match(/apt\d+/i);
    if (match) entities.push({ name: match[0].toUpperCase(), type: "Threat Actor" });
  }
  if (lowerContent.includes("volt typhoon")) {
    entities.push({ name: "Volt Typhoon", type: "Threat Actor" });
  }
  if (lowerContent.includes("lazarus")) {
    entities.push({ name: "Lazarus Group", type: "Threat Actor" });
  }
  if (lowerContent.includes("jia tan")) {
    entities.push({ name: "Jia Tan", type: "Threat Actor Persona" });
  }
  
  const cveMatch = content.match(/cve-\d{4}-\d{4,7}/i);
  if (cveMatch) {
    entities.push({ name: cveMatch[0].toUpperCase(), type: "Vulnerability CVE" });
  }

  if (lowerContent.includes("vpn") || lowerContent.includes("virtual private network")) {
    entities.push({ name: "VPN Gateway", type: "Protocol/Device" });
  }
  if (lowerContent.includes("active directory")) {
    entities.push({ name: "Active Directory", type: "Identity Store" });
  }
  if (lowerContent.includes("router") || lowerContent.includes("gateway")) {
    entities.push({ name: "Edge Router", type: "Hardware Device" });
  }

  if (entities.length === 0) {
    entities.push({ name: "Internal System", type: "Infrastructure" });
  }

  // Keywords
  const keywords: string[] = [];
  const wordsToCheck = ["exploit", "backdoor", "malware", "stealth", "credentials", "firewall", "vulnerability", "zeroday", "pre-positioning", "sshd"];
  wordsToCheck.forEach(w => {
    if (lowerContent.includes(w)) keywords.push(w);
  });
  if (keywords.length === 0) {
    keywords.push("osint", "security");
  }

  // Topic
  let topic = "Threat Intelligence Observation";
  if (lowerContent.includes("backdoor") || lowerContent.includes("supply-chain") || lowerContent.includes("supply chain")) {
    topic = "Supply Chain Integrity & Backdoors";
  } else if (lowerContent.includes("infrastructure") || lowerContent.includes("power") || lowerContent.includes("water") || lowerContent.includes("grid")) {
    topic = "Critical Infrastructure Targeting";
  } else if (lowerContent.includes("vpn") || lowerContent.includes("router") || lowerContent.includes("gateway")) {
    topic = "Edge Network Exploitation";
  } else if (lowerContent.includes("active directory") || lowerContent.includes("credential") || lowerContent.includes("password")) {
    topic = "Identity & Access Directory Control";
  }

  // Sentiment
  let sentiment = "Neutral security bulletin";
  if (lowerContent.includes("critical") || lowerContent.includes("zero-day") || lowerContent.includes("active exploitation")) {
    sentiment = "Highly Threatening / Active Alert";
  } else if (lowerContent.includes("stealth") || lowerContent.includes("reconnaissance") || lowerContent.includes("pre-positioning")) {
    sentiment = "Adversarial pre-positioning suspected";
  }

  // Policy Tags
  const policy_tags: string[] = [];
  if (lowerContent.includes("supply-chain") || lowerContent.includes("integrity")) {
    policy_tags.push("NIST-800-53-SA-12");
  }
  if (lowerContent.includes("credential") || lowerContent.includes("active directory") || lowerContent.includes("auth")) {
    policy_tags.push("NIST-800-53-AC-2");
  }
  if (lowerContent.includes("monitoring") || lowerContent.includes("detect") || lowerContent.includes("audit")) {
    policy_tags.push("NIST-800-53-SI-4");
  }
  if (policy_tags.length === 0) {
    policy_tags.push("NIST-800-53-SI-2");
  }

  // Risk Level & Priority
  let risk_level = "Medium";
  let classification_priority = "Medium";
  if (lowerContent.includes("zero-day") || lowerContent.includes("active exploitation") || lowerContent.includes("cve")) {
    risk_level = "Critical";
    classification_priority = "High";
  } else if (lowerContent.includes("volt typhoon") || lowerContent.includes("lazarus") || lowerContent.includes("infrastructure")) {
    risk_level = "High";
    classification_priority = "High";
  } else if (lowerContent.includes("reconnaissance") || lowerContent.includes("scanning")) {
    risk_level = "Medium";
    classification_priority = "Medium";
  } else {
    risk_level = "Low";
    classification_priority = "Low";
  }

  const newArt: ArticleItem = {
    id,
    title,
    content,
    feed_url: null,
    source_domain: source,
    published_date: new Date().toISOString(),
    ingestion_status: "ready",
    clearance_level: clearance,
    tags,
    created_at: new Date().toISOString(),
    entities,
    keywords,
    topic,
    sentiment,
    policy_tags,
    risk_level,
    classification_priority
  };
  db.articles.unshift(newArt);
  saveDb(db);
  return newArt;
}

export function addFeed(name: string, url: string) {
  const db = getDb();
  db.feeds.push({ name, url });
  saveDb(db);
}

export function addJob(type: string, status: string, progress: number, log_message: string) {
  const db = getDb();
  const job: JobItem = {
    id: `job-${Date.now()}`,
    type,
    status,
    progress,
    log_message,
    started_at: new Date().toISOString(),
    completed_at: null
  };
  db.jobs.unshift(job);
  saveDb(db);
  return job;
}

export function updateJob(id: string, status: string, progress: number, log_message: string) {
  const db = getDb();
  const job = db.jobs.find(j => j.id === id);
  if (job) {
    job.status = status;
    job.progress = progress;
    job.log_message = log_message;
    if (status === "success" || status === "failed") {
      job.completed_at = new Date().toISOString();
    }
    saveDb(db);
  }
}

export function addAuditLog(action: string, detail: string, user_id: string = "admin") {
  const db = getDb();
  const id = db.auditLogs.length > 0 ? Math.max(...db.auditLogs.map(l => l.id)) + 1 : 1;
  const log: AuditLogItem = {
    id,
    action,
    user_id,
    detail,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(log);
  saveDb(db);
  return log;
}

export function addFeedback(reportId: string, rating: number, comments: string) {
  const db = getDb();
  const report = db.reports.find(r => r.id === reportId);
  if (report) {
    report.reviewer_feedback = `[Rating: ${rating}/5] ${comments}`;
    saveDb(db);
    return true;
  }
  
  // Check agent reports
  // If reports are stored, we can search in reports
  return false;
}
