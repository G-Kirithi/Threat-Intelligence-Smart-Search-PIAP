"""
Knowledge Graph storage repository for PIAP, managing NetworkX operations and GML persistence.
"""

from datetime import datetime, timezone
import os
from typing import Any, Dict, List, Optional, Tuple
import networkx as nx
from piap.config import GRAPH_PATH
from piap.utils.logging import logger

class GraphStore:
    """
    Handles local, persistent Knowledge Graph operations using NetworkX and GML files.
    """
    def __init__(self):
        self.graph = nx.MultiDiGraph()
        self._load_graph()

    def _load_graph(self) -> None:
        """
        Loads the graph from the persistent GML file if it exists.
        """
        if os.path.exists(GRAPH_PATH):
            try:
                # GML loader
                self.graph = nx.read_gml(str(GRAPH_PATH))
                logger.info(f"Loaded existing Knowledge Graph from {GRAPH_PATH} with {self.graph.number_of_nodes()} nodes and {self.graph.number_of_edges()} edges.")
            except Exception as e:
                logger.error(f"Failed to load Knowledge Graph from {GRAPH_PATH}: {e}. Creating a new empty graph.")
                self.graph = nx.MultiDiGraph()
        else:
            logger.info("No pre-existing Knowledge Graph found. Creating a new empty graph.")
            self.graph = nx.MultiDiGraph()

    def persist(self) -> None:
        """
        Saves the current NetworkX graph to the persistent GML file.
        """
        try:
            nx.write_gml(self.graph, str(GRAPH_PATH))
            logger.info(f"Knowledge Graph successfully persisted to {GRAPH_PATH}.")
        except Exception as e:
            logger.error(f"Failed to persist Knowledge Graph: {e}")

    def add_triple(
        self,
        subject: str,
        predicate: str,
        obj: str,
        evidence_ids: List[str],
        confidence: float = 1.0,
        clearance: str = "unclassified"
    ) -> None:
        """
        Adds or merges a Subject-Predicate-Object triple into the NetworkX Knowledge Graph.
        If the relation already exists, it updates the metadata (e.g. appends evidence, updates confidence).
        """
        if not subject or not predicate or not obj:
            return

        # Canonicalize names
        sub_name = subject.strip().title()
        obj_name = obj.strip().title()
        pred_name = predicate.strip().upper()

        # Check if subject/object nodes exist, add with default properties if not
        if not self.graph.has_node(sub_name):
            self.graph.add_node(sub_name, label=sub_name, type="ENTITY", created_at=datetime.now(timezone.utc).isoformat())
        if not self.graph.has_node(obj_name):
            self.graph.add_node(obj_name, label=obj_name, type="ENTITY", created_at=datetime.now(timezone.utc).isoformat())

        # GML doesn't support list values, so serialize evidence as a string
        evidence_str = ",".join(evidence_ids)

        # Check for duplicate edge
        edge_exists = False
        edge_key = None
        if self.graph.has_edge(sub_name, obj_name):
            # Iterate through parallel edges
            for key in self.graph[sub_name][obj_name]:
                edge_data = self.graph[sub_name][obj_name][key]
                if edge_data.get("relation") == pred_name:
                    edge_exists = True
                    edge_key = key
                    break

        if edge_exists and edge_key is not None:
            # Merge edge data
            existing_data = self.graph[sub_name][obj_name][edge_key]
            existing_ev = set(existing_data.get("evidence", "").split(",")) if existing_data.get("evidence") else set()
            existing_ev.update(evidence_ids)
            
            # Update attributes
            self.graph[sub_name][obj_name][edge_key]["evidence"] = ",".join([e for e in existing_ev if e])
            # Max out confidence or average them
            self.graph[sub_name][obj_name][edge_key]["confidence"] = max(existing_data.get("confidence", 0.0), confidence)
            self.graph[sub_name][obj_name][edge_key]["timestamp"] = datetime.now(timezone.utc).isoformat()
            logger.info(f"Merged existing Knowledge Graph edge: ({sub_name}) -[{pred_name}]-> ({obj_name})")
        else:
            # Create new edge
            self.graph.add_edge(
                sub_name,
                obj_name,
                relation=pred_name,
                evidence=evidence_str,
                confidence=confidence,
                clearance=clearance,
                timestamp=datetime.now(timezone.utc).isoformat()
            )
            logger.info(f"Created new Knowledge Graph edge: ({sub_name}) -[{pred_name}]-> ({obj_name})")

        # Save updates to disk
        self.persist()

    def get_neighbors(self, node: str) -> Dict[str, Any]:
        """
        Retrieves all immediate neighbor nodes and relationships for a given node.
        Useful for exploring sub-graphs and tracing evidence trails.
        """
        node_name = node.strip().title()
        if not self.graph.has_node(node_name):
            return {"node": node_name, "found": False, "neighbors": []}

        neighbors_list = []
        
        # Outgoing edges
        for target in self.graph.successors(node_name):
            for key in self.graph[node_name][target]:
                edge_data = self.graph[node_name][target][key]
                neighbors_list.append({
                    "node": target,
                    "direction": "outgoing",
                    "relation": edge_data.get("relation"),
                    "confidence": edge_data.get("confidence"),
                    "evidence": edge_data.get("evidence", "").split(",") if edge_data.get("evidence") else [],
                    "timestamp": edge_data.get("timestamp")
                })
                
        # Incoming edges
        for source in self.graph.predecessors(node_name):
            for key in self.graph[source][node_name]:
                edge_data = self.graph[source][node_name][key]
                neighbors_list.append({
                    "node": source,
                    "direction": "incoming",
                    "relation": edge_data.get("relation"),
                    "confidence": edge_data.get("confidence"),
                    "evidence": edge_data.get("evidence", "").split(",") if edge_data.get("evidence") else [],
                    "timestamp": edge_data.get("timestamp")
                })

        return {
            "node": node_name,
            "found": True,
            "neighbors": neighbors_list
        }

    def get_all_triples(self) -> List[Dict[str, Any]]:
        """
        Retrieves all triples in the graph as a list of dictionaries.
        """
        triples = []
        for u, v, key, data in self.graph.edges(keys=True, data=True):
            triples.append({
                "subject": u,
                "predicate": data.get("relation", "RELATED_TO"),
                "object": v,
                "confidence": data.get("confidence", 1.0),
                "evidence": data.get("evidence", "").split(",") if data.get("evidence") else [],
                "timestamp": data.get("timestamp")
            })
        return triples

    def clear(self) -> None:
        """
        Clears the entire knowledge graph.
        """
        self.graph.clear()
        self.persist()
