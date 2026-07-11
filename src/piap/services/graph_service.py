"""
Service for querying and traversing the semantic NetworkX Knowledge Graph.
"""

from typing import Any, Dict, List, Set
from piap.storage.graph_store import GraphStore
from piap.utils.logging import logger

class GraphService:
    """
    Traverses and extracts sub-graphs and relationship networks from the graph store.
    """
    def __init__(self, graph_store: GraphStore):
        self.store = graph_store

    def get_full_graph_data(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Formats the complete NetworkX graph into standard node-link JSON structure
        commonly used by frontend graphing visualizers like D3.js or force-directed canvases.
        """
        nodes = []
        # Extract unique nodes with properties
        for node, attrs in self.store.graph.nodes(data=True):
            nodes.append({
                "id": node,
                "label": attrs.get("label", node),
                "type": attrs.get("type", "ENTITY"),
                "created_at": attrs.get("created_at")
            })

        links = []
        # Extract unique links with properties
        for u, v, key, attrs in self.store.graph.edges(keys=True, data=True):
            links.append({
                "source": u,
                "target": v,
                "key": key,
                "predicate": attrs.get("relation", "RELATED_TO"),
                "confidence": attrs.get("confidence", 1.0),
                "clearance": attrs.get("clearance", "unclassified"),
                "evidence": attrs.get("evidence", "").split(",") if attrs.get("evidence") else [],
                "timestamp": attrs.get("timestamp")
            })

        logger.info(f"Formed d3-compatible KG payload with {len(nodes)} nodes and {len(links)} links.")
        return {"nodes": nodes, "links": links}

    def query_entity_subgraph(self, root_entity: str, hops: int = 1) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extracts a localized sub-graph centered on a root entity up to a given number of hops.
        Perfect for zooming into threat intelligence actors or campaigns.
        """
        root_name = root_entity.strip().title()
        if not self.store.graph.has_node(root_name):
            return {"nodes": [], "links": []}

        # Find nodes within hop limit using BFS
        visited_nodes: Set[str] = {root_name}
        current_layer: Set[str] = {root_name}

        for _ in range(hops):
            next_layer: Set[str] = set()
            for node in current_layer:
                # Add successors and predecessors
                for succ in self.store.graph.successors(node):
                    if succ not in visited_nodes:
                        next_layer.add(succ)
                for pred in self.store.graph.predecessors(node):
                    if pred not in visited_nodes:
                        next_layer.add(pred)
            if not next_layer:
                break
            visited_nodes.update(next_layer)
            current_layer = next_layer

        # Build sub-graph nodes list
        sub_nodes = []
        for n in visited_nodes:
            attrs = self.store.graph.nodes[n]
            sub_nodes.append({
                "id": n,
                "label": attrs.get("label", n),
                "type": attrs.get("type", "ENTITY")
            })

        # Build sub-graph links list (only linking nodes that are both in our visited list)
        sub_links = []
        for u, v, key, attrs in self.store.graph.edges(keys=True, data=True):
            if u in visited_nodes and v in visited_nodes:
                sub_links.append({
                    "source": u,
                    "target": v,
                    "predicate": attrs.get("relation", "RELATED_TO"),
                    "confidence": attrs.get("confidence", 1.0),
                    "evidence": attrs.get("evidence", "").split(",") if attrs.get("evidence") else []
                })

        return {"nodes": sub_nodes, "links": sub_links}
