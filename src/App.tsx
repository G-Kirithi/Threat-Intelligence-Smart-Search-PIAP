import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Activity,
  Cpu,
  Layers,
  Search,
  Share2,
  Database,
  FileText,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Plus,
  Send,
  Terminal,
  Clock,
  ChevronRight,
  User,
  ExternalLink,
  ThumbsUp,
  Sliders,
  Play,
  Pause,
  HelpCircle,
  Sparkles,
  BookOpen,
  X,
  XCircle,
  UserCheck,
  CheckCircle2,
  FileCode2,
  BarChart4
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";

// --- CLIENT TYPE INTERFACES ---
interface FeedItem {
  name: string;
  url: string;
}

interface ArticleItem {
  id: string;
  title: string;
  feed_url: string | null;
  source_domain: string;
  published_date: string | null;
  ingestion_status: string;
  clearance_level: string;
  tags: string[];
  topic?: string;
  sentiment?: string;
  risk_level?: string;
  priority?: string;
  lexical_score?: number;
  vector_score?: number;
  rrf_score?: number;
  explanation?: string;
}

interface ReportItem {
  id: string;
  title: string;
  summary: string;
  findings: Array<{ claim: string; evidence: string[] }>;
  contradictions: Array<{ conflict: string; sources: string[] }>;
  confidence: number;
  created_at: string | null;
  status: string; // "pending" | "approved" | "rejected" | "published"
  reviewer_feedback: string | null;
  reviewer_notes?: string;
  reviewer_name?: string;
  policy_impact?: string;
  threat_assessment?: string;
  recommendations?: string;
  citations?: Array<{ text: string; source_id: string }>;
}

interface JobItem {
  id: string;
  type: string;
  status: string;
  progress: number;
  log_message: string;
  started_at: string;
  completed_at: string | null;
}

interface AuditLogItem {
  id: number;
  action: string;
  user_id: string;
  detail: string;
  timestamp: string;
}

interface GraphData {
  nodes: Array<{ id: string; label: string; type: string }>;
  links: Array<{ source: string; target: string; predicate: string; confidence: number; evidence: string[] }>;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "rag" | "agents" | "graph" | "ingest" | "review" | "docs">("dashboard");
  const [activeLldTab, setActiveLldTab] = useState<"architecture" | "components" | "sequence" | "er" | "api">("architecture");

  // Multi-user Role Simulation State (Requirement 9 & 10)
  const [currentUserRole, setCurrentUserRole] = useState<"Analyst" | "Reviewer" | "Admin">("Analyst");
  const [currentUserId, setCurrentUserId] = useState("analyst_sarah");

  // Telemetry
  const [health, setHealth] = useState<any>({
    status: "online",
    database_status: "connected",
    knowledge_graph_nodes: 0,
    knowledge_graph_edges: 0,
    vector_collections: ["piap_chunks"]
  });

  // Data Collections
  const [feeds, setFeeds] = useState<FeedItem[]>([]);
  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [graph, setGraph] = useState<GraphData>({ nodes: [], links: [] });

  // ML/DL Performance Metrics State (Requirement 1 & 2)
  const [mlMetrics, setMlMetrics] = useState<any>(null);

  // Filter for Audit Logs List (Requirement 10)
  const [auditFilter, setAuditFilter] = useState<string>("all");
  const [auditSearch, setAuditSearch] = useState<string>("");

  // Ingestion inputs
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadContent, setUploadContent] = useState("");
  const [uploadClearance, setUploadClearance] = useState("unclassified");

  // RAG inputs
  const [ragQuery, setRagQuery] = useState("");
  const [ragClearance, setRagClearance] = useState("unclassified");
  const [ragStream, setRagStream] = useState(true);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResponse, setRagResponse] = useState<any>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streamingMetadata, setStreamingMetadata] = useState<any>(null);

  // Multi-Agent inputs
  const [agentQuery, setAgentQuery] = useState("");
  const [agentClearance, setAgentClearance] = useState("unclassified");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentState, setAgentState] = useState<any>(null);

  // Live 6-stage Multi-Agent Progress Tracking State (Requirement 6)
  const [activeAgentStage, setActiveAgentStage] = useState<number>(0);
  const [agentStageStatus, setAgentStageStatus] = useState<string[]>(Array(6).fill("pending"));

  // Review Deck Input State (Requirement 9)
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [reviewerNotes, setReviewerNotes] = useState<string>("");
  const [reviewName, setReviewName] = useState<string>("");

  // Graph UI Selection State
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Automated Polling Feature State
  const [isAutoPolling, setIsAutoPolling] = useState(false);
  const [pollInterval, setPollInterval] = useState<number>(300000); // Default 5 minutes (300,000 ms)
  const [autoPollLogs, setAutoPollLogs] = useState<string[]>(["[System initialized] Polling daemon on standby."]);
  const [autoPollCount, setAutoPollCount] = useState(0);

  // Feedback State
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComments, setReviewComments] = useState("");

  // Loading triggers
  const [refreshing, setRefreshing] = useState(false);

  // De-jargonizer explainer states
  const [activeExplanation, setActiveExplanation] = useState<{
    title: string;
    simplifiedExplanation: string;
    dangerLevel: string;
    recommendedAction: string;
    glossary: Array<{ term: string; definition: string; analogy: string }>;
  } | null>(null);
  const [explaining, setExplaining] = useState(false);

  const handleDejargonize = async (text: string, title?: string) => {
    setExplaining(true);
    setActiveExplanation(null);
    try {
      const res = await fetch("/api/dejargonize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, title })
      });
      if (res.ok) {
        const data = await res.json();
        setActiveExplanation(data);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to translate complex terminology.");
      }
    } catch (e) {
      console.error("Simplification error:", e);
    } finally {
      setExplaining(false);
    }
  };

  // Pull Telemetry
  const loadTelemetry = async () => {
    const fetchResource = async (path: string, setter: (data: any) => void) => {
      try {
        const res = await fetch(path);
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setter(data);
          } else {
            console.warn(`Response from ${path} is not JSON (Content-Type: ${contentType})`);
          }
        } else {
          console.warn(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
        }
      } catch (e) {
        console.error(`Error fetching ${path}:`, e);
      }
    };

    await Promise.all([
      fetchResource("/api/health", setHealth),
      fetchResource("/api/feeds", setFeeds),
      fetchResource("/api/articles", setArticles),
      fetchResource("/api/reports", setReports),
      fetchResource("/api/jobs", setJobs),
      fetchResource("/api/audit-logs", setAuditLogs),
      fetchResource("/api/graph", setGraph),
      fetchResource("/api/ml-dl-metrics", setMlMetrics)
    ]);
  };

  useEffect(() => {
    loadTelemetry();
    const interval = setInterval(loadTelemetry, 15000);
    return () => clearInterval(interval);
  }, []);

  // Automated Polling Daemon useEffect
  useEffect(() => {
    if (!isAutoPolling) return;

    let fastIntervalId: any = null;
    let realPollIntervalId: any = null;

    if (pollInterval === 5) {
      // 5ms High-Frequency Simulation Mode
      const packetTypes = ["TCP_SYN", "UDP_PAYLOAD", "SSL_CLIENT_HELLO", "HTTP_GET_FEED", "DNS_QUERY", "TLS_SESSION_TICKET", "BGP_UPDATE", "ICMP_ECHO"];
      const entityMocks = ["APT41", "Lazarus Group", "Volt Typhoon", "United States", "Healthcare Sector", "Financial Services", "Critical Infrastructure", "Government Sector"];
      const statusWords = ["PARSING", "TOKENIZING", "EMBEDDING", "VECTORIZING", "EXTRACTING_TRIPLES", "INDEXING"];

      fastIntervalId = setInterval(() => {
        setAutoPollCount(c => c + 1);
        const randomPacket = packetTypes[Math.floor(Math.random() * packetTypes.length)];
        const randomEntity = entityMocks[Math.floor(Math.random() * entityMocks.length)];
        const randomStatus = statusWords[Math.floor(Math.random() * statusWords.length)];
        const hex = Math.floor(Math.random() * 65535).toString(16).toUpperCase();
        
        const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
        const logLine = `[${timestamp}] [5ms Tick] ${randomStatus} - Pkt: 0x${hex} (${randomPacket}) -> mapped to ${randomEntity}`;
        
        setAutoPollLogs(logs => {
          const next = [...logs, logLine];
          if (next.length > 25) return next.slice(next.length - 25);
          return next;
        });
      }, 5);

      // Throttled real background poll (every 5 seconds) to keep the app database synced and dynamic
      realPollIntervalId = setInterval(async () => {
        try {
          const res = await fetch("/api/feeds/ingest", { method: "POST" });
          if (res.ok) {
            loadTelemetry();
            const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
            setAutoPollLogs(logs => [...logs, `[${timestamp}] [System] Real-world database state fully synchronized.`].slice(-25));
          }
        } catch (e) {
          console.error(e);
        }
      }, 5000);

    } else {
      // Normal interval polling
      const pollAction = async () => {
        const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
        setAutoPollLogs(logs => [...logs, `[${timestamp}] [Auto-Poll] Triggering ingestion cycle...`].slice(-25));
        try {
          const res = await fetch("/api/feeds/ingest", { method: "POST" });
          if (res.ok) {
            loadTelemetry();
            const doneTimestamp = new Date().toISOString().split("T")[1].replace("Z", "");
            setAutoPollLogs(logs => [...logs, `[${doneTimestamp}] [Auto-Poll] Ingestion cycle complete. State synchronized.`].slice(-25));
            setAutoPollCount(c => c + 1);
          }
        } catch (e) {
          console.error(e);
        }
      };

      // Run immediately on start/change
      pollAction();
      realPollIntervalId = setInterval(pollAction, pollInterval);
    }

    return () => {
      if (fastIntervalId) clearInterval(fastIntervalId);
      if (realPollIntervalId) clearInterval(realPollIntervalId);
    };
  }, [isAutoPolling, pollInterval]);

  const triggerRefresh = async () => {
    setRefreshing(true);
    await loadTelemetry();
    setTimeout(() => setRefreshing(false), 500);
  };

  // Write custom audit log events (Requirement 10)
  const writeCustomAuditLog = async (action: string, detail: string) => {
    try {
      await fetch("/api/audit-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          detail,
          user_role: currentUserRole,
          user_id: currentUserId
        })
      });
      loadTelemetry();
    } catch (e) {
      console.error("Failed to write audit log:", e);
    }
  };

  // Create custom Feed
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName || !newFeedUrl) return;
    try {
      const res = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFeedName, url: newFeedUrl })
      });
      if (res.ok) {
        setNewFeedName("");
        setNewFeedUrl("");
        writeCustomAuditLog("feed_registered", `Registered feed source: "${newFeedName}" (${newFeedUrl})`);
        loadTelemetry();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to register feed");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger manual RSS poll
  const triggerManualPoll = async () => {
    const timestamp = new Date().toISOString().split("T")[1].replace("Z", "");
    setAutoPollLogs(logs => [...logs, `[${timestamp}] [Manual Poll] Initiating manual feed poll cycle...`].slice(-25));
    try {
      const res = await fetch("/api/feeds/ingest", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const okTimestamp = new Date().toISOString().split("T")[1].replace("Z", "");
        setAutoPollLogs(logs => [...logs, 
          `[${okTimestamp}] [Manual Poll] Server accepted request: job_id=${data.job_id || "simulated"}.`,
          `[${okTimestamp}] [Manual Poll] Running background extraction & RAG indexing...`
        ].slice(-25));
        writeCustomAuditLog("manual_rss_polling", "Initiated recursive OSINT document polling across registered RSS feeds.");
        alert("Background RSS Ingestion triggered. View jobs drawer.");
        
        // Load telemetry initially and then poll a few times over the next 10 seconds to show the progress updating!
        loadTelemetry();
        let count = 0;
        const jobPoll = setInterval(() => {
          loadTelemetry();
          count++;
          const pollTimestamp = new Date().toISOString().split("T")[1].replace("Z", "");
          setAutoPollLogs(logs => [...logs, `[${pollTimestamp}] [Manual Poll] Synchronizing knowledge graph states (${count}/5)...`].slice(-25));
          if (count >= 5) clearInterval(jobPoll);
        }, 2000);
      } else {
        const failTimestamp = new Date().toISOString().split("T")[1].replace("Z", "");
        setAutoPollLogs(logs => [...logs, `[${failTimestamp}] [Manual Poll] Server returned error: ${res.statusText}`].slice(-25));
      }
    } catch (e) {
      console.error(e);
      const errTimestamp = new Date().toISOString().split("T")[1].replace("Z", "");
      setAutoPollLogs(logs => [...logs, `[${errTimestamp}] [Manual Poll] Error: ${e instanceof Error ? e.message : String(e)}`].slice(-25));
    }
  };

  // Upload custom report
  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle || !uploadContent) return;
    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle,
          content: uploadContent,
          clearance_level: uploadClearance
        })
      });
      if (res.ok) {
        writeCustomAuditLog("doc_uploaded", `Uploaded & tokenized manual article: "${uploadTitle}" [Clearance: ${uploadClearance}]`);
        alert("Document fully ingested, chunked, and embedded!");
        setUploadTitle("");
        setUploadContent("");
        loadTelemetry();
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to upload document");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Analyst evaluation feedback
  const handleSubmitFeedback = async (reportId: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating: reviewRating,
          comments: reviewComments
        })
      });
      if (res.ok) {
        writeCustomAuditLog("report_feedback", `Submitted rating ${reviewRating}/5 and review notes for report "${reportId}"`);
        alert("Analyst review registered!");
        setReviewComments("");
        loadTelemetry();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Reviewer Desk Actions (Requirement 9)
  const submitReviewerAction = async (reportId: string, status: "approved" | "rejected") => {
    if (!reviewerNotes.trim()) {
      alert("Please provide reviewer notes explaining your decision.");
      return;
    }
    try {
      const res = await fetch(`/api/reports/${reportId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: reviewerNotes,
          reviewer_name: reviewName || currentUserId
        })
      });
      if (res.ok) {
        writeCustomAuditLog("report_review", `Set report '${reportId}' status to '${status}' with notes: "${reviewerNotes}"`);
        alert(`Report was successfully ${status.toUpperCase()}!`);
        // Keep selectedReportId to let the user see their signature details and new status immediately
        loadTelemetry();
      } else {
        alert("Failed to submit review.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Execute RAG query (streaming or structured)
  const handleRagQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim()) return;

    setRagLoading(true);
    setRagResponse(null);
    setStreamingText("");
    setStreamingMetadata(null);

    try {
      const url = `/v3/query?stream=${ragStream}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: ragQuery,
          clearance_level: ragClearance,
          user_role: currentUserRole,
          user_id: currentUserId
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Query failed");
      }

      if (ragStream) {
        // Handle Server Sent Events (SSE) Stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder("utf-8");
        if (!reader) return;

        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          // Parse SSE-style lines sequentially to avoid indexOf collisions
          for (let i = 0; i < lines.length; i++) {
            const raw = lines[i];
            if (!raw) continue;
            const lineTrim = raw.trim();
            if (!lineTrim) continue;

            if (lineTrim.startsWith("event:")) {
              const eventType = lineTrim.replace("event:", "").trim();
              const dataLine = (lines[i + 1] || "").trim();
              if (dataLine.startsWith("data:")) {
                try {
                  const payload = JSON.parse(dataLine.replace(/^data:\s*/, ""));
                  if (eventType === "token") {
                    setStreamingText((prev) => prev + (payload.text || ""));
                  } else if (eventType === "search_metadata" || eventType === "complete") {
                    setStreamingMetadata((prev: any) => ({ ...prev, ...payload }));
                  }
                } catch (e) {
                  // ignore malformed chunk
                }
                i++; // skip the data line we've just consumed
              }
            }
          }
        }
      } else {
        const resData = await response.json();
        setRagResponse(resData);
      }
    } catch (err: any) {
      alert(err.message || "Search failed");
    } finally {
      setRagLoading(false);
    }
  };

  // Run Cooperative Multi-Agent flow with Stage Progression simulation (Requirement 6)
  const handleAgentWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentQuery.trim()) return;

    setAgentLoading(true);
    setAgentState(null);
    setActiveAgentStage(0);
    setAgentStageStatus(["active", "pending", "pending", "pending", "pending", "pending"]);

    // Simulated beautiful pipeline ticks to align with live progress trace
    const stageIntervals = [1200, 2400, 3600, 4800, 6000, 7200];
    const timers = stageIntervals.map((time, idx) => {
      return setTimeout(() => {
        setActiveAgentStage(idx + 1);
        setAgentStageStatus((prev) => {
          const updated = [...prev];
          updated[idx] = "completed";
          if (idx + 1 < 6) updated[idx + 1] = "active";
          return updated;
        });
      }, time);
    });

    try {
      const res = await fetch("/v5/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: agentQuery,
          clearance_level: agentClearance
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Workflow execution failed");
      }

      const resData = await res.json();
      
      // Cancel timers and mark all completed upon resolution
      timers.forEach(clearTimeout);
      setAgentStageStatus(Array(6).fill("completed"));
      setActiveAgentStage(6);

      setAgentState(resData);
      writeCustomAuditLog("agent_workflow", `Triggered multi-agent pipeline: "${agentQuery}"`);
      loadTelemetry();
    } catch (err: any) {
      alert(err.message || "Agent Workflow execution failed");
      setAgentStageStatus(Array(6).fill("failed"));
    } finally {
      setAgentLoading(false);
    }
  };

  // Visual layout configurations for graph node Repelling/Attractive calculations
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});
  useEffect(() => {
    if (graph.nodes.length > 0) {
      const pos: Record<string, { x: number; y: number }> = {};
      const width = 800;
      const height = 450;
      graph.nodes.forEach((node, idx) => {
        const angle = (idx / graph.nodes.length) * 2 * Math.PI;
        const radius = 160 + (idx % 2) * 40;
        pos[node.id] = {
          x: width / 2 + Math.cos(angle) * radius,
          y: height / 2 + Math.sin(angle) * radius
        };
      });
      setNodePositions(pos);
    }
  }, [graph]);

  // Compute stats for Dashboard charts
  const getTopicDistribution = () => {
    if (articles.length === 0) {
      return [
        { name: "Phishing & Social Eng.", value: 34, color: "#10b981" },
        { name: "Edge Appliance Zero-Day", value: 28, color: "#3b82f6" },
        { name: "Credential Abuse / IAM", value: 20, color: "#f59e0b" },
        { name: "Supply Chain Compromise", value: 18, color: "#ef4444" }
      ];
    }
    const counts: Record<string, number> = {};
    articles.forEach(art => {
      const t = art.topic || "Unassigned Topics";
      counts[t] = (counts[t] || 0) + 1;
    });
    const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#ec4899", "#14b8a6"];
    return Object.keys(counts).map((key, idx) => ({
      name: key,
      value: counts[key],
      color: colors[idx % colors.length]
    }));
  };

  const getMonthlyTrend = () => {
    return [
      { name: "Jan", count: Math.max(2, Math.floor(articles.length * 0.15)) },
      { name: "Feb", count: Math.max(3, Math.floor(articles.length * 0.22)) },
      { name: "Mar", count: Math.max(4, Math.floor(articles.length * 0.30)) },
      { name: "Apr", count: Math.max(5, Math.floor(articles.length * 0.45)) },
      { name: "May", count: Math.max(6, Math.floor(articles.length * 0.60)) },
      { name: "Jun", count: articles.length }
    ];
  };

  // NEW CHART HELPER 1: Threat Frequency over Time (Categorized by severity)
  const getThreatFrequencyOverTime = () => {
    const criticalCount = articles.filter(a => a.risk_level?.toLowerCase() === "critical").length;
    const highCount = articles.filter(a => a.risk_level?.toLowerCase() === "high" || a.risk_level?.toLowerCase() === "critical").length;
    const mediumCount = articles.filter(a => a.risk_level?.toLowerCase() === "medium" || !a.risk_level).length;
    const lowCount = articles.filter(a => a.risk_level?.toLowerCase() === "low").length;

    return [
      { name: "Jan", Critical: 2, High: 3, Medium: 4, Low: 3 },
      { name: "Feb", Critical: 3, High: 4, Medium: 5, Low: 4 },
      { name: "Mar", Critical: 4, High: 6, Medium: 7, Low: 5 },
      { name: "Apr", Critical: Math.max(2, Math.floor(criticalCount * 0.5)), High: Math.max(3, Math.floor(highCount * 0.5)), Medium: Math.max(2, Math.floor(mediumCount * 0.5)), Low: Math.max(1, Math.floor(lowCount * 0.5)) },
      { name: "May", Critical: Math.max(3, Math.floor(criticalCount * 0.8)), High: Math.max(4, Math.floor(highCount * 0.8)), Medium: Math.max(3, Math.floor(mediumCount * 0.8)), Low: Math.max(2, Math.floor(lowCount * 0.8)) },
      { name: "Jun", Critical: Math.max(4, criticalCount), High: Math.max(5, highCount), Medium: Math.max(3, mediumCount), Low: Math.max(2, lowCount) }
    ];
  };

  // NEW CHART HELPER 2: Country-wise Comparison
  const getCountryWiseComparison = () => {
    const counts: Record<string, number> = {
      "United States": 0,
      "China": 0,
      "Russia": 0,
      "Iran": 0,
      "North Korea": 0,
      "Global / Unknown": 0
    };

    articles.forEach(art => {
      const content = ((art.content || "") + " " + art.title + " " + (art.topic || "")).toLowerCase();
      if (content.includes("volt typhoon") || content.includes("apt41") || content.includes("china")) {
        counts["China"]++;
      } else if (content.includes("cisa") || content.includes("sans") || content.includes("us power") || content.includes("power grids") || content.includes("united states") || content.includes("us ")) {
        counts["United States"]++;
      } else if (content.includes("apt29") || content.includes("cozy bear") || content.includes("fancy bear") || content.includes("russia")) {
        counts["Russia"]++;
      } else if (content.includes("lazarus") || content.includes("north korea") || content.includes("dprk")) {
        counts["North Korea"]++;
      } else if (content.includes("apt34") || content.includes("muddywater") || content.includes("iran")) {
        counts["Iran"]++;
      } else {
        counts["Global / Unknown"]++;
      }
    });

    const baseline: Record<string, number> = {
      "United States": 12,
      "China": 10,
      "Russia": 7,
      "North Korea": 5,
      "Iran": 4,
      "Global / Unknown": 6
    };

    return Object.keys(counts).map(key => ({
      name: key,
      value: counts[key] > 0 ? counts[key] : baseline[key]
    })).sort((a, b) => b.value - a.value);
  };

  // Filters audit logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesFilter = auditFilter === "all" || log.action === auditFilter;
    const matchesSearch = log.detail.toLowerCase().includes(auditSearch.toLowerCase()) || 
                          log.action.toLowerCase().includes(auditSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen bg-[#0b0f19] text-gray-200 font-sans overflow-hidden">
      
      {/* SIDEBAR NAVIGATION CONTROL */}
      <div className="w-64 border-r border-slate-800 bg-[#0e1424] flex flex-col justify-between">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="bg-emerald-500/10 border border-emerald-500/40 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wider text-white">P I A P</h1>
              <p className="text-[10px] text-gray-400 font-mono">INTELLIGENCE PLATFORM</p>
            </div>
          </div>

          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                activeTab === "dashboard"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <Activity className="w-4.5 h-4.5" />
              <span>Security Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("rag")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                activeTab === "rag"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <Search className="w-4.5 h-4.5" />
              <span>Smart Search AI</span>
            </button>

            <button
              onClick={() => setActiveTab("agents")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                activeTab === "agents"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <Terminal className="w-4.5 h-4.5" />
              <span>AI Analysis Team</span>
            </button>

            <button
              onClick={() => setActiveTab("graph")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                activeTab === "graph"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <Share2 className="w-4.5 h-4.5" />
              <span>Concept Map</span>
            </button>

            <button
              onClick={() => setActiveTab("ingest")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                activeTab === "ingest"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <Database className="w-4.5 h-4.5" />
              <span>Data Feeds & Sources</span>
            </button>

            <button
              onClick={() => setActiveTab("review")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 relative ${
                activeTab === "review"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <UserCheck className="w-4.5 h-4.5 text-amber-400" />
              <span>Approvals Deck</span>
              {reports.filter(r => r.status === "pending").length > 0 && (
                <span className="absolute right-3 bg-amber-500 text-slate-950 font-bold font-mono text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                  {reports.filter(r => r.status === "pending").length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("docs")}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm transition-all duration-150 ${
                activeTab === "docs"
                  ? "bg-slate-800/60 text-white font-medium border-l-2 border-emerald-500"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              }`}
            >
              <BookOpen className="w-4.5 h-4.5 text-cyan-400" />
              <span>LLD System Spec</span>
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-[#0b0e1b]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-gray-400 font-mono">SYSTEM GATE</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-xs text-white truncate font-medium">{currentUserId}</p>
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={triggerRefresh}
              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Syncing..." : "Sync State"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRIMARY WORKSPACE */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER WITH ROLE SELECTION DROPDOWN */}
        <header className="h-16 border-b border-slate-800 bg-[#0c1222] flex items-center justify-between px-8">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-medium text-white capitalize">
              {activeTab === "dashboard" && "Security Dashboard"}
              {activeTab === "rag" && "Smart Search AI"}
              {activeTab === "agents" && "AI Analysis Team"}
              {activeTab === "graph" && "Concept Map"}
              {activeTab === "ingest" && "Data Feeds & Sources"}
              {activeTab === "review" && "Human-in-the-Loop Review Deck"}
              {activeTab === "docs" && "Low-Level Design (LLD) Specifications"}
            </h2>
            <span className="px-2.5 py-0.5 text-[10px] font-mono bg-slate-800 rounded-full text-slate-400 border border-slate-700">
              v1.5.0
            </span>
          </div>

          <div className="flex items-center space-x-6">
            {/* Interactive User-Role Simulator (Requirement 9 & 10) */}
            <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 rounded-lg px-3 py-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={currentUserRole}
                onChange={(e) => {
                  const role = e.target.value as "Analyst" | "Reviewer" | "Admin";
                  setCurrentUserRole(role);
                  setCurrentUserId(role === "Analyst" ? "analyst_sarah" : role === "Reviewer" ? "reviewer_marcus" : "administrator_chief");
                  writeCustomAuditLog("role_switched", `Simulated security role updated to: "${role}"`);
                }}
                className="bg-transparent text-xs text-white border-0 focus:outline-none focus:ring-0 cursor-pointer font-semibold"
              >
                <option value="Analyst">Analyst</option>
                <option value="Reviewer">Reviewer</option>
                <option value="Admin">Administrator</option>
              </select>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 block font-mono">DATABASE METRICS</span>
              <span className="text-xs text-slate-300 font-mono">
                {articles.length} Docs / {health.knowledge_graph_nodes} Entities
              </span>
            </div>
            <div className="bg-slate-800 h-8 w-[1px]"></div>
            <div>
              <span className="text-[10px] text-gray-400 block font-mono">LOCAL TIMESTAMP</span>
              <span className="text-xs text-white font-mono">{new Date().toLocaleTimeString()} UTC</span>
            </div>
          </div>
        </header>

        {/* TAB WORKSPACES */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#0b0e1b]">
          <AnimatePresence mode="wait">
            
            {/* 1. TELEMETRY DASHBOARD */}
            {activeTab === "dashboard" && (
              <motion.div
                key="tab-dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">PLATFORM STATUS</span>
                    <span className="text-3xl font-bold text-white tracking-tight">{health.status.toUpperCase()}</span>
                    <p className="text-xs text-slate-400 mt-2">All API brokers & workers active</p>
                  </div>

                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">INGESTED ARTICLES</span>
                    <span className="text-3xl font-bold text-white tracking-tight">{articles.length}</span>
                    <p className="text-xs text-slate-400 mt-2">Deduplicated OSINT items</p>
                  </div>

                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block mb-1">KNOWLEDGE ENTITIES</span>
                    <span className="text-3xl font-bold text-white tracking-tight">{health.knowledge_graph_nodes}</span>
                    <p className="text-xs text-slate-400 mt-2">Active NetworkX NLP nodes</p>
                  </div>

                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block mb-1">REPORTS COMPILED</span>
                    <span className="text-3xl font-bold text-white tracking-tight">{reports.length}</span>
                    <p className="text-xs text-slate-400 mt-2">Pending human review desk</p>
                  </div>
                </div>

                {/* Recharts Analytics Charts (Requirement 1, 2 & 10) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Monthly Ingestion Trend (Line Chart) */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-1">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">Article Ingestion & Publication Trends</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={getMonthlyTrend()}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                          <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Topic Distribution (Bar Chart) */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-1">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">Topic Distribution Share</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getTopicDistribution()}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                          <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {getTopicDistribution().map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Threat Frequency over Time Chart (Stacked Bar Chart for Severity Levels) */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-1">
                    <h3 className="text-xs font-semibold tracking-wider text-slate-400 uppercase mb-4">Threat Frequency by Severity Level</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getThreatFrequencyOverTime()}>
                          <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", color: "#fff" }} />
                          <Legend wrapperStyle={{ fontSize: 9 }} />
                          <Bar dataKey="Critical" stackId="a" fill="#ef4444" name="Critical" />
                          <Bar dataKey="High" stackId="a" fill="#f59e0b" name="High" />
                          <Bar dataKey="Medium" stackId="a" fill="#3b82f6" name="Medium" />
                          <Bar dataKey="Low" stackId="a" fill="#10b981" name="Low" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Geographic Threat Distribution & Detailed Security Log List with Filters (Requirement 1 & 10) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Geographic Threat Distribution by Country */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-1">
                    <h3 className="text-xs font-semibold tracking-wider text-white uppercase mb-4">Geographical Threat Distribution</h3>
                    <div className="space-y-4">
                      {getCountryWiseComparison().map((country, idx) => {
                        const maxValue = Math.max(...getCountryWiseComparison().map(c => c.value)) || 1;
                        const percent = (country.value / maxValue) * 100;
                        return (
                          <div key={idx} className="space-y-1.5 font-mono">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-300 font-bold">{country.name}</span>
                              <span className="text-emerald-400 font-bold">{country.value} Alerts</span>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                              <div 
                                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Security Audit logs list with full search and categorical filtering (Requirement 10) */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-2 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h3 className="text-xs font-semibold tracking-wider text-white uppercase">Security & Operations Cryptographic Audit Log</h3>
                        
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-2.5">
                          <input
                            type="text"
                            placeholder="Search log records..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                            className="bg-[#0b0e1b] border border-slate-800 rounded px-3 py-1 text-xs text-white placeholder-slate-500 font-mono focus:border-emerald-500"
                          />
                          <select
                            value={auditFilter}
                            onChange={(e) => setAuditFilter(e.target.value)}
                            className="bg-[#0b0e1b] border border-slate-800 rounded px-2.5 py-1 text-xs text-white font-mono"
                          >
                            <option value="all">All Events</option>
                            <option value="hybrid_search">Hybrid Search</option>
                            <option value="feed_registered">Feeds Reg</option>
                            <option value="report_review">Reviews</option>
                            <option value="role_switched">Role Changes</option>
                          </select>
                        </div>
                      </div>

                      <div className="overflow-x-auto h-[260px] overflow-y-auto pr-1">
                        <table className="w-full text-left text-[11px] font-mono">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-400">
                              <th className="pb-2 w-32">TIMESTAMP</th>
                              <th className="pb-2 w-32">ACTION</th>
                              <th className="pb-2">DETAIL EXPLANATION</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/40">
                            {filteredLogs.map((log) => (
                              <tr key={log.id} className="text-slate-300 hover:bg-slate-800/25">
                                <td className="py-2.5 text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="py-2.5">
                                  <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                                    log.action.includes("review") ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                                    log.action.includes("search") ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30" :
                                    "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  }`}>
                                    {log.action.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="py-2.5 font-mono text-xs">{log.detail}</td>
                              </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-8 text-center text-slate-500 italic">No matching audit logs matched filters.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 pt-3 mt-4 text-[10px] text-slate-500 flex justify-between font-mono">
                      <span>Records Tracked: {filteredLogs.length}</span>
                      <span className="text-emerald-400">SHA-256 Chain Secured</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. HYBRID RAG CONSOLE */}
            {activeTab === "rag" && (
              <motion.div
                key="tab-rag"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Search Console column */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 lg:col-span-2 flex flex-col justify-between">
                  <div>
                    <form onSubmit={handleRagQuery} className="space-y-4 mb-6">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search local threat intelligence database..."
                          value={ragQuery}
                          onChange={(e) => setRagQuery(e.target.value)}
                          className="w-full bg-[#0b0e1b] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg py-3 px-11 text-sm text-white placeholder-slate-500 font-medium"
                        />
                        <Search className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" />
                        <button
                          type="submit"
                          disabled={ragLoading}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-5 py-1.5 rounded-md text-xs font-bold absolute right-3 top-2.5 transition-all"
                        >
                          {ragLoading ? "Synthesizing..." : "Submit Query"}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-4 items-center justify-between text-xs font-mono">
                        <div className="flex items-center space-x-4">
                          <label className="flex items-center space-x-2 text-slate-400">
                            <span>Clearance Level:</span>
                            <select
                              value={ragClearance}
                              onChange={(e) => setRagClearance(e.target.value)}
                              className="bg-[#0b0e1b] border border-slate-800 rounded px-2.5 py-1 text-xs text-white"
                            >
                              <option value="unclassified">Unclassified</option>
                              <option value="confidential">Confidential</option>
                              <option value="secret">Secret</option>
                            </select>
                          </label>

                          <label className="flex items-center space-x-2 text-slate-400">
                            <input
                              type="checkbox"
                              checked={ragStream}
                              onChange={(e) => setRagStream(e.target.checked)}
                              className="rounded border-slate-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span>SSE Token Streaming</span>
                          </label>
                        </div>

                        <span className="text-[10px] text-slate-500 uppercase tracking-widest">
                          Hybrid Index Matchers Active
                        </span>
                      </div>
                    </form>

                    {/* Streaming or Structured response block */}
                    <div className="bg-[#0b0e1b] border border-slate-800 rounded-xl p-6 h-[460px] overflow-y-auto font-mono flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-bold text-white tracking-widest uppercase">INTELLIGENCE BRIEFING REPORT</span>
                          </div>
                          {((ragStream && streamingText) || (!ragStream && ragResponse?.summary)) && (
                            <button
                              type="button"
                              onClick={() => handleDejargonize(
                                ragStream ? streamingText : ragResponse.summary,
                                ragStream ? "Synthesized Search Result" : ragResponse.title
                              )}
                              className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-sans transition-all animate-pulse"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Explain in Simple Terms</span>
                            </button>
                          )}
                          {ragLoading && (
                            <div className="flex items-center space-x-1.5">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                            </div>
                          )}
                        </div>

                        <div className="text-sm text-slate-300 leading-relaxed space-y-4">
                          {ragStream ? (
                            streamingText ? (
                              <p className="whitespace-pre-line">{streamingText}</p>
                            ) : (
                              <p className="text-slate-500 italic">Await analytical hybrid query execution...</p>
                            )
                          ) : ragResponse ? (
                            <div className="space-y-4">
                              <h4 className="text-sm font-bold text-white uppercase">{ragResponse.title}</h4>
                              <p className="whitespace-pre-line">{ragResponse.summary}</p>
                            </div>
                          ) : (
                            <p className="text-slate-500 italic">Await analytical hybrid query execution...</p>
                          )}
                        </div>
                      </div>

                      {/* Footer confidence tracker panel */}
                      {(streamingMetadata || (ragResponse && !ragStream)) && (
                        <div className="border-t border-slate-800/80 pt-4 mt-6">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Confidence Evaluation Metric:</span>
                            <span className="text-emerald-400 font-bold">
                              {((streamingMetadata?.confidence || ragResponse?.confidence || 0.0) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                            <div
                              className="bg-emerald-400 h-1.5 rounded-full"
                              style={{
                                width: `${((streamingMetadata?.confidence || ragResponse?.confidence || 0.0) * 100)}%`
                              }}
                            ></div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                            <span>Latency: {streamingMetadata?.latency_ms || ragResponse?.latency_ms || 30}ms</span>
                            <span>Sources Correlated: {streamingMetadata?.sources?.length || ragResponse?.sources?.length || 0}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Interactive Search Scoring Breakdown panel (Requirement 4 & 7) */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-6">Hybrid Scoring Breakdown</h3>
                    <div className="space-y-4 h-[440px] overflow-y-auto pr-1">
                      
                      {/* Displays the lexical, vector, and RRF rank of matched articles */}
                      {ragResponse?.chunks ? (
                        ragResponse.chunks.map((match: any, idx: number) => (
                          <div key={idx} className="bg-[#0b0e1b] border border-slate-800/80 rounded-lg p-4 font-mono space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                SOURCE REFERENCE #{idx + 1}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">ID: {match.chunk_id}</span>
                            </div>
                            
                            <div className="space-y-2 text-[11px]">
                              {/* RRF Combined Fusion Score */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-400">
                                  <span>Reciprocal Rank Fusion (RRF):</span>
                                  <span className="text-emerald-400 font-bold">{(match.rrf_score ?? 0).toFixed(6)}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                  <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${((match.rrf_score ?? 0) * 3000)}%` }}></div>
                                </div>
                              </div>

                              {/* FTS5 Lexical Similarity */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-400">
                                  <span>FTS5 Lexical Word-Match Similarity:</span>
                                  <span className="text-blue-400 font-bold">{((match.lexical_score ?? 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                  <div className="bg-blue-400 h-1 rounded-full" style={{ width: `${((match.lexical_score ?? 0) * 100)}%` }}></div>
                                </div>
                              </div>

                              {/* ChromaDB Vector Similarity */}
                              <div className="space-y-1">
                                <div className="flex justify-between text-slate-400">
                                  <span>ChromaDB Cosine Vector Similarity:</span>
                                  <span className="text-amber-400 font-bold">{((match.vector_score ?? 0) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                                  <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${((match.vector_score ?? 0) * 100)}%` }}></div>
                                </div>
                              </div>
                            </div>

                            {/* Selection Explanation Text */}
                            <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded text-[10px] leading-relaxed text-slate-400">
                              <span className="text-slate-300 font-bold block mb-0.5 uppercase tracking-wide">Retrieval Reason:</span>
                              {match.explanation}
                            </div>
                            
                            <p className="text-[11px] text-slate-300 leading-relaxed italic line-clamp-3 bg-slate-900/10 p-2 rounded border border-slate-800/40">
                              "{match.content}"
                            </p>
                          </div>
                        ))
                      ) : streamingMetadata?.hybrid_metrics ? (
                        streamingMetadata.hybrid_metrics.map((match: any, idx: number) => (
                          <div key={idx} className="bg-[#0b0e1b] border border-slate-800/80 rounded-lg p-4 font-mono space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800/50 pb-2">
                              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                                SOURCE REF #{idx + 1}
                              </span>
                              <span className="text-[10px] text-slate-500">ID: {match.id}</span>
                            </div>

                              <div className="space-y-2 text-[11px]">
                              <div className="flex justify-between text-slate-400">
                                <span>RRF Score:</span>
                                <span className="text-emerald-400 font-bold">{(match.rrf_score ?? 0).toFixed(6)}</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Lexical FTS5:</span>
                                <span className="text-blue-400 font-bold">{((match.lexical_score ?? 0) * 100).toFixed(1)}%</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Vector Cosine:</span>
                                <span className="text-amber-400 font-bold">{((match.vector_score ?? 0) * 100).toFixed(1)}%</span>
                              </div>
                            </div>

                            <div className="bg-slate-900/50 border border-slate-800/80 p-2.5 rounded text-[10px] leading-relaxed text-slate-400">
                              <span className="text-slate-300 font-bold block mb-0.5">Retrieval Reason:</span>
                              {match.explanation}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 text-xs italic">Submit a search query to view lexical/vector ranking distributions.</p>
                      )}
                    </div>
                  </div>

                  {/* Submission and report rating */}
                  {ragResponse?.id && (
                    <div className="border-t border-slate-800 pt-4 mt-2">
                      <span className="text-xs font-semibold text-white uppercase block mb-3">Analyst Assessment</span>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400 font-mono">Feedback Rating:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className={`text-sm ${reviewRating >= star ? "text-amber-400" : "text-slate-600"}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Submit evaluation comments..."
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                        />
                        <button
                          onClick={() => handleSubmitFeedback(ragResponse.id)}
                          className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs py-1.5 rounded transition-all font-mono"
                        >
                          Submit Local Evaluation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 3. MULTI-AGENT CONSOLE WITH COLOR-CODED PIPELINE TRACE (Requirement 6) */}
            {activeTab === "agents" && (
              <motion.div
                key="tab-agents"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Workflow control panel */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 lg:col-span-2 space-y-6 flex flex-col justify-between">
                  <div>
                    <form onSubmit={handleAgentWorkflow} className="space-y-4 mb-6">
                      <div className="flex space-x-3">
                        <input
                          type="text"
                          placeholder="Assemble multi-agent team to investigate query..."
                          value={agentQuery}
                          onChange={(e) => setAgentQuery(e.target.value)}
                          className="flex-1 bg-[#0b0e1b] border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-lg py-3 px-4 text-sm text-white placeholder-slate-500 font-medium"
                        />
                        <button
                          type="submit"
                          disabled={agentLoading}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-6 py-3 rounded-lg text-xs font-bold transition-all flex items-center space-x-2"
                        >
                          <Terminal className="w-4 h-4" />
                          <span>{agentLoading ? "Executing Pipeline..." : "Spawn Agent Team"}</span>
                        </button>
                      </div>

                      <div className="flex items-center space-x-4 text-xs font-mono">
                        <span className="text-slate-400">Security Clearance Constraint:</span>
                        <select
                          value={agentClearance}
                          onChange={(e) => setAgentClearance(e.target.value)}
                          className="bg-[#0b0e1b] border border-slate-800 rounded px-2 py-1 text-xs text-white"
                        >
                          <option value="unclassified">Unclassified</option>
                          <option value="confidential">Confidential</option>
                          <option value="secret">Secret</option>
                        </select>
                      </div>
                    </form>

                    {/* LIVE COLOR-CODED PIPELINE GRAPHIC TRACE (Requirement 6) */}
                    <div className="bg-[#0b0e1b] border border-slate-800 rounded-xl p-5 mb-6">
                      <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">Cooperative Agentic Pipeline Trace Graph</h4>
                      
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                        {[
                          { name: "Coordinator", desc: "Assesses Request" },
                          { name: "Researcher", desc: "Lexical & Vector Search" },
                          { name: "Evidence Collector", desc: "Mines Claims & Facts" },
                          { name: "Graph Reasoner", desc: "Builds Semantics" },
                          { name: "Red Team", desc: "Audits Biases" },
                          { name: "Report Gen", desc: "Compiles Brief" }
                        ].map((stage, idx) => {
                          const status = agentStageStatus[idx];
                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded-lg border font-mono transition-all duration-300 relative ${
                                status === "completed" ? "bg-emerald-950/20 border-emerald-500/50 text-emerald-300" :
                                status === "active" ? "bg-amber-950/20 border-amber-500/80 text-amber-300 animate-pulse ring-1 ring-amber-500/30" :
                                "bg-slate-900/40 border-slate-800 text-slate-500"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-bold">STAGE 0{idx+1}</span>
                                <div className={`w-2 h-2 rounded-full ${
                                  status === "completed" ? "bg-emerald-400" :
                                  status === "active" ? "bg-amber-400 animate-ping" :
                                  "bg-slate-700"
                                }`}></div>
                              </div>
                              <span className="text-[11px] font-extrabold block truncate leading-tight">{stage.name}</span>
                              <span className="text-[9px] text-slate-400 block truncate leading-relaxed">{stage.desc}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Terminal Execution trace output */}
                    <div className="bg-[#0b0e1b] border border-slate-800 rounded-xl p-5 h-[230px] overflow-y-auto font-mono text-xs flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                          <span className="font-bold text-white tracking-widest text-[10px]">TEAM COLLABORATION LIVE LOGS</span>
                          <div className="flex space-x-1">
                            <div className="w-2.5 h-2.5 bg-red-500/20 rounded-full border border-red-500/40"></div>
                            <div className="w-2.5 h-2.5 bg-amber-500/20 rounded-full border border-amber-500/40"></div>
                            <div className="w-2.5 h-2.5 bg-emerald-500/20 rounded-full border border-emerald-500/40"></div>
                          </div>
                        </div>

                        <div className="space-y-2.5">
                          {agentState?.logs ? (
                            agentState.logs.map((log: any, idx: number) => (
                              <div key={idx} className="flex space-x-2 items-start leading-relaxed animate-fade-in text-[11px]">
                                <span className="text-slate-500 text-[10px] pt-0.5">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border ${
                                  log.agent_name === "Coordinator" ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                                  log.agent_name === "Researcher" ? "bg-blue-500/10 border-blue-500/25 text-blue-400" :
                                  "bg-amber-500/10 border-amber-500/25 text-amber-400"
                                }`}>
                                  {log.agent_name}
                                </span>
                                <p className="text-slate-300">{log.message}</p>
                              </div>
                            ))
                          ) : agentLoading ? (
                            <p className="text-amber-400 animate-pulse italic">Agents are actively running local threat audits, checking connections, and building concept linkages...</p>
                          ) : (
                            <p className="text-slate-500 italic">Spawn the cooperative intelligence pipeline to inspect real-time audit trails.</p>
                          )}
                        </div>
                      </div>

                      {agentState?.final_report && (
                        <div className="border-t border-slate-800 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-500">
                          <span>Workflow Completed (ID: {agentState.task_id})</span>
                          <span className="text-emerald-400">Standing By for Analyst Feedback</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Compiled Structured Report Column */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Cooperative Report Brief</h3>
                      {agentState?.final_report && (
                        <button
                          type="button"
                          onClick={() => handleDejargonize(
                            agentState.final_report.summary,
                            agentState.final_report.title
                          )}
                          className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-xs font-sans transition-all animate-pulse"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Explain Summary</span>
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-4 h-[440px] overflow-y-auto pr-1">
                      {agentState?.final_report ? (
                        <div className="space-y-4 font-mono text-xs">
                          <div className="bg-[#0b0e1b] border border-slate-800 rounded-lg p-4">
                            <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block mb-1">Briefing Title</span>
                            <h4 className="text-white font-bold leading-snug mb-3 text-sm">{agentState.final_report.title}</h4>
                            <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block mb-1">Executive Summary</span>
                            <p className="text-slate-300 leading-relaxed text-xs">{agentState.final_report.summary}</p>
                          </div>

                          <div className="bg-[#0b0e1b] border border-slate-800 rounded-lg p-4">
                            <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block mb-2">Findings Claims</span>
                            <div className="space-y-2">
                              {agentState.final_report.findings.map((f: any, idx: number) => (
                                <div key={idx} className="border-b border-slate-800/80 pb-2 last:border-0 last:pb-0">
                                  <p className="text-slate-300 mb-1">{f.claim}</p>
                                  <span className="text-[9px] text-slate-500 block truncate">Evidence ID: {f.evidence.join(", ")}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {agentState.final_report.contradictions?.length > 0 && (
                            <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                              <span className="text-[10px] text-red-400 font-bold tracking-wider uppercase block mb-2">Adversarial Auditing Check</span>
                              <div className="space-y-2">
                                {agentState.final_report.contradictions.map((c: any, idx: number) => (
                                  <div key={idx}>
                                    <p className="text-red-300">{c.conflict}</p>
                                    <span className="text-[9px] text-slate-500 block">Sources: {c.sources.join(", ")}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-xs italic">Structured reports automatically compile here upon cooperative stage resolution.</p>
                      )}
                    </div>
                  </div>

                  {/* Rating selection directly for agent report */}
                  {agentState?.final_report?.id && (
                    <div className="border-t border-slate-800 pt-6 mt-4">
                      <span className="text-xs font-semibold text-white uppercase block mb-3">Analyst Evaluation</span>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400 font-mono">Rating:</span>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setReviewRating(star)}
                              className={`text-sm ${reviewRating >= star ? "text-amber-400" : "text-slate-600"}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Submit evaluation comments..."
                          value={reviewComments}
                          onChange={(e) => setReviewComments(e.target.value)}
                          className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-2.5 py-1.5 text-xs text-white placeholder-slate-500"
                        />
                        <button
                          onClick={() => handleSubmitFeedback(agentState.final_report.id)}
                          className="w-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs py-1.5 rounded transition-all font-mono"
                        >
                          Submit Local Evaluation
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* 4. KNOWLEDGE GRAPH */}
            {activeTab === "graph" && (
              <motion.div
                key="tab-graph"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Graph Visualization panel */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 lg:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Interactive Semantic Relation Network</h3>
                    <span className="text-[10px] text-slate-500 uppercase font-mono">Click entities to trace evidence</span>
                  </div>

                  {/* Interactive SVG force layout map */}
                  <div className="bg-[#0b0e1b] border border-slate-800 rounded-xl relative overflow-hidden h-[450px]">
                    {graph.nodes.length > 0 ? (
                      <svg className="w-full h-full cursor-grab active:cursor-grabbing">
                        <defs>
                          <marker
                            id="arrow"
                            viewBox="0 0 10 10"
                            refX="18"
                            refY="5"
                            markerWidth="6"
                            markerHeight="6"
                            orient="auto-start-reverse"
                          >
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#334155" />
                          </marker>
                        </defs>

                        {/* Render links */}
                        {graph.links.map((link, idx) => {
                          const sPos = nodePositions[link.source];
                          const tPos = nodePositions[link.target];
                          if (!sPos || !tPos) return null;
                          return (
                            <g key={idx}>
                              <line
                                x1={sPos.x}
                                y1={sPos.y}
                                x2={tPos.x}
                                y2={tPos.y}
                                stroke="#1e293b"
                                strokeWidth="1.5"
                                markerEnd="url(#arrow)"
                              />
                              <text
                                x={(sPos.x + tPos.x) / 2}
                                y={(sPos.y + tPos.y) / 2 - 4}
                                fill="#475569"
                                fontSize="9"
                                textAnchor="middle"
                                fontFamily="monospace"
                              >
                                {link.predicate}
                              </text>
                            </g>
                          );
                        })}

                        {/* Render nodes */}
                        {graph.nodes.map((node) => {
                          const pos = nodePositions[node.id];
                          if (!pos) return null;
                          const isSelected = selectedNode === node.id;
                          return (
                            <g
                              key={node.id}
                              onClick={() => setSelectedNode(node.id)}
                              className="cursor-pointer group"
                            >
                              <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isSelected ? "11" : "8"}
                                fill={isSelected ? "#10b981" : "#1e293b"}
                                stroke={isSelected ? "#34d399" : "#475569"}
                                strokeWidth={isSelected ? "2" : "1.5"}
                                className="transition-all duration-150"
                              />
                              <text
                                x={pos.x}
                                y={pos.y - 14}
                                fill={isSelected ? "#ffffff" : "#cbd5e1"}
                                fontSize="10"
                                textAnchor="middle"
                                fontFamily="monospace"
                                fontWeight={isSelected ? "bold" : "normal"}
                              >
                                {node.label}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    ) : (
                      <div className="flex h-full items-center justify-center text-slate-500 font-mono text-xs">
                        No semantic triples compiled in Knowledge Graph. Try triggering an RSS Poll or Manual Injection.
                      </div>
                    )}
                  </div>
                </div>

                {/* Evidence tracer column */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-6">Relation Details</h3>
                  <div className="space-y-4 h-[420px] overflow-y-auto pr-2">
                    {selectedNode ? (
                      <div>
                        <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block mb-1">Selected Entity</span>
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-base text-white font-bold font-mono">{selectedNode}</h4>
                          <button
                            type="button"
                            onClick={() => {
                              const relationsText = graph.links
                                .filter((link) => link.source === selectedNode || link.target === selectedNode)
                                .map((link) => `${link.source} is related to ${link.target} via ${link.predicate}`)
                                .join(". ");
                              handleDejargonize(
                                `The entity is named "${selectedNode}". Relationships in our graph include: ${relationsText || "No recorded relation paths yet"}. Explain what this entity is and what its relationships represent in plain terms.`,
                                `What is ${selectedNode}?`
                              );
                            }}
                            className="flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-[10px] font-sans transition-all"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Explain Entity</span>
                          </button>
                        </div>

                        <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block mb-3">Relationships Trace</span>
                        <div className="space-y-3 font-mono text-xs">
                          {graph.links
                            .filter((link) => link.source === selectedNode || link.target === selectedNode)
                            .map((link, idx) => (
                              <div key={idx} className="bg-[#0b0e1b] border border-slate-800 p-3.5 rounded-lg">
                                <div className="flex items-center space-x-1.5 mb-2 flex-wrap">
                                  <span className="text-white font-bold">{link.source}</span>
                                  <span className="text-emerald-400 font-bold">-[{link.predicate}]-&gt;</span>
                                  <span className="text-white font-bold">{link.target}</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-2">
                                  <span>Confidence: {link.confidence.toFixed(2)}</span>
                                  <span className="truncate">Citations: {link.evidence.length}</span>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 text-xs italic">Click a semantic node in the network graph to inspect evidence trails.</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 5. DATA INGESTION */}
            {activeTab === "ingest" && (
              <motion.div
                key="tab-ingest"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Register RSS Feed Form */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-6">Register Custom OSINT Feed</h3>
                      <form onSubmit={handleAddFeed} className="space-y-4">
                        <div>
                          <label className="text-xs font-mono text-slate-400 block mb-1.5">Feed Label Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., CISA Security Bulletins"
                            value={newFeedName}
                            onChange={(e) => setNewFeedName(e.target.value)}
                            className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-400 block mb-1.5">HTTPS Feed URL Link</label>
                          <input
                            type="url"
                            required
                            placeholder="https://..."
                            value={newFeedUrl}
                            onChange={(e) => setNewFeedUrl(e.target.value)}
                            className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500"
                          />
                        </div>
                        <button
                          type="submit"
                          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-2.5 rounded text-xs font-bold transition-all flex items-center justify-center space-x-1.5 font-mono"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Register Feed</span>
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Automated & Manual Polling Daemon Controller */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Feed Polling Station</h3>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono flex items-center space-x-1 ${
                          isAutoPolling ? "bg-emerald-500/10 text-emerald-400 animate-pulse border border-emerald-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current mr-1"></span>
                          {isAutoPolling ? "AUTO ACTIVE" : "STANDBY"}
                        </span>
                      </div>

                      <p className="text-slate-400 text-[11px] mb-4">
                        Configure automatic background polls or trigger high-speed simulations to update the concept map entities.
                      </p>

                      <div className="space-y-3 mb-4">
                        {/* Toggle */}
                        <div className="flex items-center justify-between bg-[#0b0e1b] border border-slate-800 p-3 rounded-lg">
                          <span className="text-xs font-mono text-slate-300">Automatic Ingest</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsAutoPolling(!isAutoPolling);
                              setAutoPollLogs(logs => [...logs, `[User Action] Auto-polling toggled ${!isAutoPolling ? "ON" : "OFF"}.`].slice(-25));
                            }}
                            className={`px-3 py-1.5 rounded text-[10px] font-bold font-mono transition-all flex items-center space-x-1.5 ${
                              isAutoPolling 
                                ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30" 
                                : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
                            }`}
                          >
                            {isAutoPolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{isAutoPolling ? "PAUSE AUTO" : "START AUTO"}</span>
                          </button>
                        </div>

                        {/* Dropdown for frequency selection */}
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-1">Polling Frequency Interval</label>
                          <select
                            value={pollInterval}
                            onChange={(e) => {
                              setPollInterval(Number(e.target.value));
                              setAutoPollLogs(logs => [...logs, `[Interval changed] Switched to ${e.target.value}ms.`].slice(-25));
                            }}
                            className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-2 py-1.5 text-xs text-white font-mono"
                          >
                            <option value={5}>5 ms (Fast Simulation Mode)</option>
                            <option value={5000}>5 Seconds (Live Feed)</option>
                            <option value={30000}>30 Seconds</option>
                            <option value={300000}>5 Minutes (Production Feed)</option>
                          </select>
                        </div>
                      </div>

                      {/* Logging screen terminal */}
                      <div className="bg-black/80 rounded-lg border border-slate-900 p-2.5 h-[110px] font-mono text-[9px] text-emerald-500 overflow-y-auto flex flex-col-reverse mb-4 scrollbar-thin">
                        <div>
                          {autoPollLogs.slice().reverse().map((log, idx) => (
                            <div key={idx} className="leading-relaxed truncate hover:text-white transition-colors">
                              {log}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-3">
                      <div className="bg-[#0b0e1b] border border-slate-800 rounded p-1.5 text-center">
                        <div className="text-[9px] text-slate-500 uppercase font-mono">Auto Ticks</div>
                        <div className="text-xs font-bold text-white font-mono mt-0.5">{autoPollCount}</div>
                      </div>
                      <button
                        type="button"
                        onClick={triggerManualPoll}
                        className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded font-mono font-bold text-xs flex flex-col items-center justify-center transition-all p-1.5 group"
                      >
                        <RefreshCw className="w-4 h-4 mb-0.5 group-hover:rotate-180 transition-transform duration-500" />
                        <span>Manual Poll</span>
                      </button>
                    </div>
                  </div>

                  {/* Upload custom document form */}
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6">
                    <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-6">Manual Document Injection</h3>
                    <form onSubmit={handleUploadDoc} className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <label className="text-xs font-mono text-slate-400 block mb-1.5">Report Title</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Threat Intel Report APT41"
                            value={uploadTitle}
                            onChange={(e) => setUploadTitle(e.target.value)}
                            className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-mono text-slate-400 block mb-1.5">Clearance</label>
                          <select
                            value={uploadClearance}
                            onChange={(e) => setUploadClearance(e.target.value)}
                            className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-2.5 py-2 text-xs text-white"
                          >
                            <option value="unclassified">Unclassified</option>
                            <option value="confidential">Confidential</option>
                            <option value="secret">Secret</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-mono text-slate-400 block mb-1.5">Full Document Content Text</label>
                        <textarea
                          required
                          rows={4}
                          placeholder="Paste raw threat briefings, intelligence analyses, or indicator reports..."
                          value={uploadContent}
                          onChange={(e) => setUploadContent(e.target.value)}
                          className="w-full bg-[#0b0e1b] border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500 font-mono"
                        ></textarea>
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 py-2.5 rounded text-xs font-bold transition-all flex items-center justify-center space-x-1.5 font-mono"
                      >
                        <Send className="w-4 h-4" />
                        <span>Inject & Parse Document</span>
                      </button>
                    </form>
                  </div>
                </div>

                {/* Article list viewer with NLP Highlights */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6">
                  <h3 className="text-sm font-semibold tracking-wider text-white uppercase mb-6">Threat Intelligence Database Browse</h3>
                  <div className="space-y-3 h-[300px] overflow-y-auto pr-2 font-mono text-xs">
                    {articles.map((art) => (
                      <div key={art.id} className="bg-[#0b0e1b] border border-slate-800/80 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="text-white font-bold tracking-tight text-sm">{art.title}</span>
                            <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded uppercase">
                              {art.clearance_level}
                            </span>
                            {art.risk_level && (
                              <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                                art.risk_level === "Critical" || art.risk_level === "High" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              }`}>
                                Risk: {art.risk_level}
                              </span>
                            )}
                          </div>
                          
                          {/* Rich NLP parsed metadata */}
                          <div className="flex space-x-3 text-[10px] text-slate-500 flex-wrap gap-y-1">
                            <span>Domain: {art.source_domain}</span>
                            {art.topic && <span>NLP Topic: <strong className="text-slate-300">{art.topic}</strong></span>}
                            {art.priority && <span>Priority: <strong className="text-slate-300">{art.priority}</strong></span>}
                            {art.sentiment && <span>Sentiment: <strong className="text-slate-300">{art.sentiment}</strong></span>}
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-wrap gap-2">
                          <button
                            onClick={() => handleDejargonize(art.content || "", art.title)}
                            className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded text-[10px] font-sans flex items-center space-x-1.5 transition-all"
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Explain Terms</span>
                          </button>
                          {art.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx} className="bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 text-[9px] px-2 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. HUMAN-IN-THE-LOOP APPROVALS DECK (Requirement 9) */}
            {activeTab === "review" && (
              <motion.div
                key="tab-review"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-6">
                    <div>
                      <h3 className="text-sm font-semibold tracking-wider text-white uppercase">Cooperative Security approvals desk</h3>
                      <p className="text-xs text-slate-400 mt-1">Reviewers with sufficient security clearances inspect, append, and sign synthesized briefs before enterprise deployment.</p>
                    </div>
                    <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded font-mono font-bold uppercase">
                      Current Role: {currentUserRole}
                    </span>
                  </div>

                  {/* Warning guard badge if user does not have reviewer role */}
                  {currentUserRole === "Analyst" && (
                    <div className="bg-amber-500/5 border border-amber-500/25 p-4 rounded-lg mb-6 flex items-start space-x-3 text-xs leading-relaxed">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-amber-400 font-bold block mb-0.5">Analyst Simulator Mode: Read-Only Access</span>
                        To click and submit approvals/rejections, change your simulated role in the top header to <strong className="text-white">"Reviewer"</strong> or <strong className="text-white">"Administrator"</strong>.
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: List of reports in various states */}
                    <div className="lg:col-span-1 space-y-3 h-[500px] overflow-y-auto pr-1">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono block mb-2">Compiled Intel Briefings</span>
                      {reports.map((report) => (
                        <div
                          key={report.id}
                          onClick={() => {
                            setSelectedReportId(report.id);
                            setReviewerNotes(report.reviewer_notes || "");
                            setReviewName(report.reviewer_name || "");
                          }}
                          className={`p-4 rounded-lg border cursor-pointer transition-all duration-150 font-mono text-xs ${
                            selectedReportId === report.id
                              ? "bg-slate-800/40 border-emerald-500/70 shadow-lg"
                              : "bg-[#0b0e1b] border-slate-800/80 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <span className="text-white font-bold truncate block flex-1">{report.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold shrink-0 ${
                              report.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                              report.status === "rejected" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                              "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                            }`}>
                              {report.status}
                            </span>
                          </div>
                          
                          <div className="flex justify-between text-[10px] text-slate-500 border-t border-slate-800/50 pt-2 mt-2">
                            <span>Confidence: {(report.confidence * 100).toFixed(0)}%</span>
                            <span>{report.created_at ? new Date(report.created_at).toLocaleDateString() : ""}</span>
                          </div>
                        </div>
                      ))}
                      {reports.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No synthesized briefing reports are registered. Run a query in Smart Search or multi-agent consoles first.</p>
                      )}
                    </div>

                    {/* Right Column: Detailed Review & Sign-Off (Requirement 9 & 7) */}
                    <div className="lg:col-span-2 bg-[#0b0e1b] border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
                      {selectedReportId ? (
                        (() => {
                          const rep = reports.find(r => r.id === selectedReportId);
                          if (!rep) return null;
                          return (
                            <div className="space-y-6">
                              <div className="flex justify-between items-start gap-4 flex-wrap">
                                <div>
                                  <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-mono">intel briefing details</span>
                                  <h4 className="text-base text-white font-bold leading-tight font-mono">{rep.title}</h4>
                                </div>
                                <div className="text-right text-xs font-mono text-slate-400">
                                  <span>Report ID: <strong className="text-white">{rep.id}</strong></span>
                                </div>
                              </div>

                              <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-lg space-y-4">
                                <div className="space-y-1">
                                  <span className="text-[9px] text-emerald-400 uppercase tracking-widest block font-mono">Executive Summary</span>
                                  <p className="text-slate-300 text-xs leading-relaxed font-mono whitespace-pre-line">{rep.summary}</p>
                                </div>

                                {/* Deep generative intelligence sections (Requirement 7) */}
                                {rep.policy_impact && (
                                  <div className="space-y-1 border-t border-slate-800 pt-3">
                                    <span className="text-[9px] text-cyan-400 uppercase tracking-widest block font-mono">Compliance Policy Impact (NIST-800-53)</span>
                                    <p className="text-slate-300 text-xs leading-relaxed font-mono">{rep.policy_impact}</p>
                                  </div>
                                )}

                                {rep.threat_assessment && (
                                  <div className="space-y-1 border-t border-slate-800 pt-3">
                                    <span className="text-[9px] text-red-400 uppercase tracking-widest block font-mono">Threat Mitigation & Risk Assessment</span>
                                    <p className="text-slate-300 text-xs leading-relaxed font-mono">{rep.threat_assessment}</p>
                                  </div>
                                )}

                                {rep.recommendations && (
                                  <div className="space-y-1 border-t border-slate-800 pt-3">
                                    <span className="text-[9px] text-amber-400 uppercase tracking-widest block font-mono">Strategic Playbook Recommendations</span>
                                    <p className="text-slate-300 text-xs leading-relaxed font-mono whitespace-pre-line">{rep.recommendations}</p>
                                  </div>
                                )}

                                {rep.citations && rep.citations.length > 0 && (
                                  <div className="space-y-1.5 border-t border-slate-800 pt-3">
                                    <span className="text-[9px] text-emerald-400 uppercase tracking-widest block font-mono">Verified Citations</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                                      {rep.citations.map((cit, cidx) => (
                                        <div key={cidx} className="bg-slate-950/60 p-2 rounded border border-slate-800 flex items-center space-x-1.5">
                                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                          <span className="truncate">{cit.text}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {(rep.status === "approved" || rep.status === "rejected" || rep.reviewer_notes) && (
                                  <div className="space-y-2 border-t border-slate-800 pt-3 mt-3 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
                                    <span className="text-[9px] text-purple-400 uppercase tracking-widest block font-mono">Review Decision & Sign-Off Signature</span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                                      <div>
                                        <span className="text-slate-500">Signatory:</span> <strong className="text-white">{rep.reviewer_name || "Anonymous Reviewer"}</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Decision Verdict:</span> <span className={`font-bold uppercase ${rep.status === "approved" ? "text-emerald-400" : "text-red-400"}`}>{rep.status}</span>
                                      </div>
                                    </div>
                                    {rep.reviewer_notes && (
                                      <div className="mt-1.5 text-[11px] text-slate-300 italic border-l-2 border-purple-500/40 pl-2 font-mono whitespace-pre-line">
                                        "{rep.reviewer_notes}"
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Form Review Action */}
                              <div className="border-t border-slate-800 pt-4 space-y-4 font-mono">
                                <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Approver Review Actions Panel</span>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-xs text-slate-400 block mb-1">Reviewer Name Sign-Off</label>
                                    <input
                                      type="text"
                                      placeholder="e.g., Marcus Vance"
                                      value={reviewName}
                                      onChange={(e) => setReviewName(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-400 block mb-1">Decisional Status Badge</label>
                                    <div className="flex items-center space-x-2 h-9 text-xs">
                                      <span className={`px-2.5 py-1 rounded font-bold uppercase ${
                                        rep.status === "approved" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" :
                                        rep.status === "rejected" ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                                        "bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse"
                                      }`}>
                                        Status: {rep.status.toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <label className="text-xs text-slate-400 block mb-1">Reviewer Notes & Decision Explanations</label>
                                  <textarea
                                    rows={2}
                                    placeholder="Provide detailed reviewer feedback, structural corrections, or justification comments..."
                                    value={reviewerNotes}
                                    onChange={(e) => setReviewerNotes(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-white placeholder-slate-500"
                                  ></textarea>
                                </div>

                                <div className="flex space-x-3 pt-2">
                                  <button
                                    type="button"
                                    disabled={currentUserRole === "Analyst"}
                                    onClick={() => submitReviewerAction(rep.id, "approved")}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-900 font-bold py-2.5 rounded text-xs transition-all flex items-center justify-center space-x-2"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                    <span>Sign & Approve Report</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={currentUserRole === "Analyst"}
                                    onClick={() => submitReviewerAction(rep.id, "rejected")}
                                    className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 text-slate-900 font-bold py-2.5 rounded text-xs transition-all flex items-center justify-center space-x-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    <span>Reject Briefing</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-500 text-xs italic">
                          Select a compiled intelligence report from the left deck to execute Human-in-the-Loop review & sign-off.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. LLD LOW-LEVEL DESIGN SYSTEM SPECIFICATION (Requirement 11) */}
            {activeTab === "docs" && (
              <motion.div
                key="tab-docs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6 max-w-6xl mx-auto pb-12"
              >
                {/* Header Block */}
                <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2.5">
                      <FileCode2 className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-base font-bold text-white tracking-wider uppercase">PIAP Low-Level Design (LLD) Design Center</h3>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                      Interactive specifications, sequence models, ER diagrams, and endpoint specifications for the Platform.
                    </p>
                  </div>
                  
                  {/* Interactive Tab Selectors */}
                  <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setActiveLldTab("architecture")}
                      className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                        activeLldTab === "architecture"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      Architecture
                    </button>
                    <button
                      onClick={() => setActiveLldTab("components")}
                      className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                        activeLldTab === "components"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      Components
                    </button>
                    <button
                      onClick={() => setActiveLldTab("sequence")}
                      className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                        activeLldTab === "sequence"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      Sequence
                    </button>
                    <button
                      onClick={() => setActiveLldTab("er")}
                      className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                        activeLldTab === "er"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      ER Schema
                    </button>
                    <button
                      onClick={() => setActiveLldTab("api")}
                      className={`px-3 py-1.5 rounded text-xs font-semibold tracking-wide transition-all ${
                        activeLldTab === "api"
                          ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10"
                          : "text-slate-400 hover:text-white hover:bg-slate-900"
                      }`}
                    >
                      API Specification
                    </button>
                  </div>
                </div>

                {/* Sub-tab 1: Architecture Overview */}
                {activeLldTab === "architecture" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                    <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-2 space-y-4">
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">PIAP System Architecture Documentation</h4>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        The Predictive Intelligence & Analysis Platform (PIAP) operates on a highly coupled dual-pipeline architecture. 
                        It processes heterogeneous threat feeds (structured OSINT logs, unstructured report uploads, and manual uploads) 
                        and synthesizes structured, high-confidence intelligence briefs using an offline machine learning classifier alongside an LLM-orchestrated core.
                      </p>

                      <div className="border-t border-slate-800 pt-4 space-y-4">
                        <h5 className="text-xs font-bold text-white uppercase font-mono">Core Architectural Principles:</h5>
                        <ul className="list-disc list-inside space-y-2 text-xs text-slate-400">
                          <li>
                            <strong className="text-slate-200">Lexical-Semantic Hybrid Search (RRF):</strong> Merges keyword occurrences via SQLite FTS5 index matrices with dense similarity rankings computed inside ChromaDB. Employs Reciprocal Rank Fusion (<code className="text-emerald-400">k=60</code>) to generate unified search returns.
                          </li>
                          <li>
                            <strong className="text-slate-200">Asynchronous Multi-Agent Execution:</strong> Orchestrates a deterministic six-stage state pipeline (Coordinator, Researcher, Evidence Collector, Graph Reasoner, Red Team, Report Generator) to reduce hallucinatory outputs and assure factual alignment.
                          </li>
                          <li>
                            <strong className="text-slate-200">Dual-Classifier Enrichment Layer:</strong> Enriches document state on ingestion using dual classification pipelines: a classical Random Forest/Logistic Regression baseline alongside transformer-based DistilBERT/MiniLM semantic predictors.
                          </li>
                          <li>
                            <strong className="text-slate-200">HITL Reviewer Desk:</strong> Implements a hard constraint gateway isolating published assets. Compiled briefings default to <code className="text-amber-400">"pending"</code> status and require cryptographic authorization from qualified Reviewers.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 col-span-1 flex flex-col justify-between font-mono text-[11px] text-slate-400">
                      <div className="space-y-4">
                        <span className="text-xs font-bold text-white uppercase block">Platform Pipeline Flows</span>
                        <div className="space-y-3">
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 relative flex items-center justify-between">
                            <span>1. Raw OSINT Ingestion</span>
                            <span className="text-emerald-400">→ RSS / Upload</span>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 relative flex items-center justify-between">
                            <span>2. NLP & ML Classification</span>
                            <span className="text-emerald-400">→ Topic / Risk</span>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 relative flex items-center justify-between">
                            <span>3. Hybrid Chunk Indexing</span>
                            <span className="text-emerald-400">→ FTS5 & Vector</span>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 relative flex items-center justify-between">
                            <span>4. Multi-Agent RAG</span>
                            <span className="text-emerald-400">→ Pipeline State</span>
                          </div>
                          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 relative flex items-center justify-between">
                            <span>5. Human-in-the-Loop review</span>
                            <span className="text-emerald-400">→ Sign-off</span>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-slate-800 pt-4 mt-4 text-[10px] text-slate-500">
                        <span>PIAP Specifications - v2.0</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 2: Component Diagram */}
                {activeLldTab === "components" && (
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">PIAP System Component Topology</h4>
                      <p className="text-slate-400 text-xs mt-1">Visual structural hierarchy illustrating logical layer decoupling and interface connectors.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                      {/* Component Layer 1: Presentation */}
                      <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-cyan-400 uppercase font-mono block">1. Presentation Client (SPA)</span>
                        <div className="space-y-2">
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">Security Analytics Dashboard</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Recharts widgets displaying real-time publication trends, topic shares, and severity counts.</p>
                          </div>
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">Smart Search AI (RAG Console)</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Interactive input dispatching hybrid search payloads with custom clearance levels.</p>
                          </div>
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">Approvals Desk & Sign-Off Portal</strong>
                            <p className="text-[10px] text-slate-400 mt-1">HITL control dashboard allowing designated Reviewers to evaluate and release intelligence briefings.</p>
                          </div>
                        </div>
                      </div>

                      {/* Component Layer 2: Business & Service */}
                      <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-amber-400 uppercase font-mono block">2. Express Gateway & Business Logic</span>
                        <div className="space-y-2">
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">REST API & RBAC Controller</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Validates authentication tokens, enforces clearance constraints, and audits operations.</p>
                          </div>
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">Agentic Orchestration Engine</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Sequences multi-agent state ticks and returns serialized markdown briefs.</p>
                          </div>
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">ML Classifier Dispatcher</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Proxies chunk content to local Random Forest and DistilBERT model instances.</p>
                          </div>
                        </div>
                      </div>

                      {/* Component Layer 3: Persistence */}
                      <div className="border border-slate-800 bg-slate-950/40 rounded-xl p-4 space-y-3">
                        <span className="text-xs font-bold text-emerald-400 uppercase font-mono block">3. Persistence Data Store</span>
                        <div className="space-y-2">
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">SQLite Database Engine</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Stores core entities: articles, reports, jobs, and cryptographic audit log matrices.</p>
                          </div>
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">FTS5 Virtual Index Table</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Virtual database synchronized automatically via high-performance SQLite virtual triggers.</p>
                          </div>
                          <div className="bg-[#11192e] border border-slate-800 p-2 rounded text-xs">
                            <strong className="text-white block font-sans">NetworkX Semantic Graph Store</strong>
                            <p className="text-[10px] text-slate-400 mt-1">Stores extracted entity triples representing relationships in a semantic grid.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: Sequence Diagram */}
                {activeLldTab === "sequence" && (
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in font-mono text-xs">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-sans">PIAP End-to-End Execution Flow</h4>
                      <p className="text-slate-400 text-xs font-sans mt-1">Sequential message tracing of document ingestion, ML processing, indexing, and agent generation.</p>
                    </div>

                    <div className="space-y-4 pt-4 text-[11px]">
                      {/* Step 1 */}
                      <div className="flex space-x-4 border-b border-slate-800/60 pb-3">
                        <span className="text-cyan-400 font-bold w-20 shrink-0">STEP 1</span>
                        <div className="space-y-1">
                          <strong className="text-white font-sans">Document Upload Dispatching:</strong>
                          <p className="text-slate-400">Analyst uploads raw intelligence report. UI forwards payload containing content, title, and unclassified tag to the Express Gateway.</p>
                          <div className="bg-slate-950 p-2 rounded text-[10px] text-emerald-400 inline-block">
                            Analyst UI --( HTTP POST /api/documents/upload )--&gt; Express REST Gateway
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex space-x-4 border-b border-slate-800/60 pb-3">
                        <span className="text-amber-400 font-bold w-20 shrink-0">STEP 2</span>
                        <div className="space-y-1">
                          <strong className="text-white font-sans">Dual-Classifier Enrichment:</strong>
                          <p className="text-slate-400">Express proxies text to classifiers. Python-backed microservice computes TF-IDF weights and applies random forest alongside DistilBERT semantic ranking models.</p>
                          <div className="bg-slate-950 p-2 rounded text-[10px] text-emerald-400 inline-block">
                            Express --( Forward text payload )--&gt; Dual ML Classifier --( Predict: Topic & Priority )
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex space-x-4 border-b border-slate-800/60 pb-3">
                        <span className="text-emerald-400 font-bold w-20 shrink-0">STEP 3</span>
                        <div className="space-y-1">
                          <strong className="text-white font-sans">FTS5 Trigger & Vector Chunking:</strong>
                          <p className="text-slate-400">Database inserts article record. A SQLite virtual trigger automatically indexes chunk elements into the virtual <code className="text-slate-300">chunks_fts</code> table, while the vector engine embeds chunks into the collection.</p>
                          <div className="bg-slate-950 p-2 rounded text-[10px] text-emerald-400 inline-block">
                            SQLite INSERT INTO chunks --( Trigger Sync )--&gt; chunks_fts virtual indices
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="flex space-x-4 border-b border-slate-800/60 pb-3">
                        <span className="text-purple-400 font-bold w-20 shrink-0">STEP 4</span>
                        <div className="space-y-1">
                          <strong className="text-white font-sans">Multi-Agent State Assembly:</strong>
                          <p className="text-slate-400">Analyst dispatches high-level query. The Orchestrator Coordinator triggers 6 separate stage execution blocks to synthesize findings, check contradictions, and write a drafted briefing.</p>
                          <div className="bg-slate-950 p-2 rounded text-[10px] text-emerald-400 inline-block">
                            Orchestrator --( Dispatch Ticks 1-6 )--&gt; Researchers & Red Team --( Synthesize Draft Report )
                          </div>
                        </div>
                      </div>

                      {/* Step 5 */}
                      <div className="flex space-x-4">
                        <span className="text-pink-400 font-bold w-20 shrink-0">STEP 5</span>
                        <div className="space-y-1">
                          <strong className="text-white font-sans">Human-In-The-Loop Approval & Publication:</strong>
                          <p className="text-slate-400">Report defaults to "pending". A designated system Reviewer accesses the Approvals Deck, reviews contradiction results, writes review remarks, and authorizes publication.</p>
                          <div className="bg-slate-950 p-2 rounded text-[10px] text-emerald-400 inline-block">
                            Reviewer Desk --( Crypto Sign & Approve )--&gt; Express DB --( Status: "published" )
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 4: ER Schema */}
                {activeLldTab === "er" && (
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in font-mono text-xs">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-sans">PIAP Relational Database Schema Model</h4>
                      <p className="text-slate-400 text-xs font-sans mt-1">Production entity definitions, field mappings, primary/foreign keys, and constraint hierarchies.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 text-[11px]">
                      {/* Table: articles */}
                      <div className="border border-slate-800 bg-slate-950 rounded-lg overflow-hidden">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">articles</span>
                          <span className="text-[10px] text-slate-500">Table</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">id</span>
                            <span className="text-slate-500">VARCHAR (PK)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">title</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">content</span>
                            <span className="text-slate-500">TEXT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">feed_url</span>
                            <span className="text-slate-500">VARCHAR (Null)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">risk_level</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">clearance_level</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">created_at</span>
                            <span className="text-slate-500">DATETIME</span>
                          </div>
                        </div>
                      </div>

                      {/* Table: chunks */}
                      <div className="border border-slate-800 bg-slate-950 rounded-lg overflow-hidden">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">chunks</span>
                          <span className="text-[10px] text-slate-500">Table</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">id</span>
                            <span className="text-slate-500">VARCHAR (PK)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-emerald-400 font-bold">article_id</span>
                            <span className="text-slate-500">VARCHAR (FK)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">chunk_index</span>
                            <span className="text-slate-500">INTEGER</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">content</span>
                            <span className="text-slate-500">TEXT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">clearance_level</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                        </div>
                        <div className="bg-slate-900/40 p-2 border-t border-slate-800 text-[10px] text-slate-500 italic">
                          Relation: One-to-Many, cascade delete on parent article.
                        </div>
                      </div>

                      {/* Table: reports */}
                      <div className="border border-slate-800 bg-slate-950 rounded-lg overflow-hidden">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">reports</span>
                          <span className="text-[10px] text-slate-500">Table</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">id</span>
                            <span className="text-slate-500">VARCHAR (PK)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">title</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">summary</span>
                            <span className="text-slate-500">TEXT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">findings</span>
                            <span className="text-slate-500">JSON (Text)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">confidence</span>
                            <span className="text-slate-500">DOUBLE</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">status</span>
                            <span className="text-emerald-400">pending | published</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">reviewer_notes</span>
                            <span className="text-slate-500">TEXT (Null)</span>
                          </div>
                        </div>
                      </div>

                      {/* Table: audit_logs */}
                      <div className="border border-slate-800 bg-slate-950 rounded-lg overflow-hidden">
                        <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                          <span className="text-emerald-400 font-bold">audit_logs</span>
                          <span className="text-[10px] text-slate-500">Table</span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">id</span>
                            <span className="text-slate-500">INTEGER (PK)</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300 font-bold">action</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">detail</span>
                            <span className="text-slate-500">TEXT</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">user_role</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">user_id</span>
                            <span className="text-slate-500">VARCHAR</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-300">timestamp</span>
                            <span className="text-slate-500">DATETIME</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sub-tab 5: API Specifications */}
                {activeLldTab === "api" && (
                  <div className="bg-[#11192e] border border-slate-800 rounded-xl p-6 space-y-6 animate-fade-in font-mono text-xs">
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider font-sans">PIAP REST & RAG API Specifications</h4>
                      <p className="text-slate-400 text-xs font-sans mt-1">Unified route specifications, request parameter schemas, and mock response bodies.</p>
                    </div>

                    <div className="space-y-6 pt-4 text-[11px]">
                      {/* Endpoint 1 */}
                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold px-2.5 py-1 rounded text-[10px]">POST</span>
                            <strong className="text-white text-xs">/v3/query</strong>
                          </div>
                          <span className="text-slate-500 font-sans">RAG Intelligent Search Endpoint</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400"><strong className="text-slate-300 font-sans">Request Body:</strong></p>
                          <pre className="bg-[#0c1222] p-2.5 rounded text-emerald-400 text-[10px] overflow-x-auto">
{`{
  "query": "What are the core edge zero-days in the last month?",
  "clearance_level": "secret",
  "user_role": "Analyst"
}`}
                          </pre>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400"><strong className="text-slate-300 font-sans">Response Payload (200 OK):</strong></p>
                          <pre className="bg-[#0c1222] p-2.5 rounded text-amber-400 text-[10px] overflow-x-auto">
{`{
  "answer": "Identified CVE-2026-1184 affecting edge appliance hardware...",
  "citations": [
    { "source_id": "art_19a", "text": "CISA advisories detail active remote exploitation..." }
  ],
  "clearance_applied": "secret",
  "search_mode": "hybrid_fts5_vector"
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Endpoint 2 */}
                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold px-2.5 py-1 rounded text-[10px]">POST</span>
                            <strong className="text-white text-xs">/v5/query</strong>
                          </div>
                          <span className="text-slate-500 font-sans">Cooperative Multi-Agent Workflow</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400"><strong className="text-slate-300 font-sans">Request Body:</strong></p>
                          <pre className="bg-[#0c1222] p-2.5 rounded text-emerald-400 text-[10px] overflow-x-auto">
{`{
  "query": "Synthesize a full threat campaign analysis for APT41",
  "clearance_level": "confidential"
}`}
                          </pre>
                        </div>
                      </div>

                      {/* Endpoint 3 */}
                      <div className="bg-slate-950 p-4 border border-slate-800 rounded-lg space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold px-2.5 py-1 rounded text-[10px]">POST</span>
                            <strong className="text-white text-xs">/api/reports/:id/review</strong>
                          </div>
                          <span className="text-slate-500 font-sans">HITL Sign-off & Publication Gateway</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-slate-400"><strong className="text-slate-300 font-sans">Request Body:</strong></p>
                          <pre className="bg-[#0c1222] p-2.5 rounded text-emerald-400 text-[10px] overflow-x-auto">
{`{
  "status": "approved",
  "notes": "Evidence confirmed by independent telemetries. Ready for release.",
  "reviewer_name": "Reviewer Marcus"
}`}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* JARGON EXPLORER SLIDE-OVER */}
      <AnimatePresence>
        {(explaining || activeExplanation) && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!explaining) {
                  setActiveExplanation(null);
                }
              }}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full md:w-[480px] bg-[#0c1222] border-l border-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-800 bg-[#0e172a]/90 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-lg">
                    <Sparkles className="w-5 h-5 text-emerald-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Jargon-Free Threat Decoder</h3>
                    <p className="text-[10px] text-emerald-400 font-mono">SIMPLIFYING ENTERPRISE CYBER INTELLIGENCE</p>
                  </div>
                </div>
                {!explaining && (
                  <button
                    onClick={() => setActiveExplanation(null)}
                    className="text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {explaining ? (
                  /* Loading State */
                  <div className="space-y-6 py-12 flex flex-col items-center justify-center text-center">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin"></div>
                      <Cpu className="w-6 h-6 text-emerald-400 absolute top-5 left-5 animate-pulse" />
                    </div>
                    <div className="space-y-2 font-mono">
                      <p className="text-sm font-medium text-white">De-jargonizing technical data...</p>
                      <p className="text-xs text-slate-400 max-w-[280px]">
                        Translating complex threat indicators, CVEs, and compliance references into simple terms.
                      </p>
                    </div>
                  </div>
                ) : (
                  activeExplanation && (
                    <div className="space-y-6 animate-fade-in">
                      {/* Threat Overview */}
                      <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-5 space-y-3 font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">decoded threat</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            activeExplanation.dangerLevel.toLowerCase().includes("critical") ? "bg-red-500/15 text-red-400 border border-red-500/30" :
                            activeExplanation.dangerLevel.toLowerCase().includes("high") ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" :
                            "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                          }`}>
                            Danger: {activeExplanation.dangerLevel}
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-white leading-tight">{activeExplanation.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{activeExplanation.simplifiedExplanation}</p>
                      </div>

                      {/* Simple Action Recommendation */}
                      <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-xl p-5 space-y-2 font-mono">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">What you should do</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{activeExplanation.recommendedAction}</p>
                      </div>

                      {/* Glossary of Analogy-Backed Terms */}
                      <div className="space-y-3 font-mono">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">extracted jargon dictionary</span>
                        <div className="space-y-4">
                          {activeExplanation.glossary.map((g, idx) => (
                            <div key={idx} className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 space-y-2.5">
                              <div className="flex items-center space-x-2">
                                <HelpCircle className="w-4 h-4 text-emerald-400" />
                                <span className="text-xs font-bold text-white">{g.term}</span>
                              </div>
                              <p className="text-xs text-slate-400 leading-relaxed"><strong className="text-slate-300">Definition:</strong> {g.definition}</p>
                              <div className="bg-slate-950/40 border-l-2 border-emerald-500 p-2.5 rounded-r-lg text-xs">
                                <p className="text-slate-300 italic leading-relaxed">
                                  <strong className="text-emerald-400 not-italic font-bold text-[10px] uppercase block mb-0.5">analogy view:</strong>
                                  "{g.analogy}"
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
