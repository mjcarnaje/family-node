import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Loader2,
  GitCompare,
  Users,
  Plus,
  Minus,
  Edit,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
  TreeDeciduous,
} from "lucide-react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "~/components/ui/collapsible";
import { ComparisonMemberNode } from "~/components/ComparisonMemberNode";
import { ParentChildEdge, MarriageEdge } from "~/components/edges";
import { useTreeComparison } from "~/hooks/useTreeComparison";
import { cn } from "~/lib/utils";

interface TreeComparisonViewProps {
  treeId1: string;
  treeId2: string;
  className?: string;
}

// Define custom node types
const nodeTypes = {
  comparisonMember: ComparisonMemberNode,
} as NodeTypes;

// Define custom edge types
const edgeTypes = {
  parentChild: ParentChildEdge,
  marriage: MarriageEdge,
} as EdgeTypes;

// Inner component for Tree 1
function Tree1Panel({ treeId1, treeId2 }: { treeId1: string; treeId2: string }) {
  const { tree1Nodes, tree1Edges, tree1, isLoading } = useTreeComparison({
    treeId1,
    treeId2,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(tree1Nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(tree1Edges);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    setNodes(tree1Nodes);
    setEdges(tree1Edges);

    if (tree1Nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1 });
      }, 50);
    }
  }, [tree1Nodes, tree1Edges, setNodes, setEdges, reactFlowInstance]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
      proOptions={{ hideAttribution: true }}
    >
      <Panel position="top-left">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{tree1?.tree.name || "Tree 1"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tree1?.members.length || 0} members
          </p>
        </div>
      </Panel>
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          const status = node.data?.comparisonStatus;
          if (status === "only-tree1") return "#ef4444";
          if (status === "modified") return "#eab308";
          return "#94a3b8";
        }}
        className="!bg-background/80"
      />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
}

// Inner component for Tree 2
function Tree2Panel({ treeId1, treeId2 }: { treeId1: string; treeId2: string }) {
  const { tree2Nodes, tree2Edges, tree2, isLoading } = useTreeComparison({
    treeId1,
    treeId2,
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(tree2Nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(tree2Edges);
  const reactFlowInstance = useReactFlow();

  useEffect(() => {
    setNodes(tree2Nodes);
    setEdges(tree2Edges);

    if (tree2Nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, maxZoom: 1 });
      }, 50);
    }
  }, [tree2Nodes, tree2Edges, setNodes, setEdges, reactFlowInstance]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      minZoom={0.1}
      maxZoom={2}
      defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
      proOptions={{ hideAttribution: true }}
    >
      <Panel position="top-left">
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md border">
          <div className="flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{tree2?.tree.name || "Tree 2"}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tree2?.members.length || 0} members
          </p>
        </div>
      </Panel>
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          const status = node.data?.comparisonStatus;
          if (status === "only-tree2") return "#22c55e";
          if (status === "modified") return "#eab308";
          return "#94a3b8";
        }}
        className="!bg-background/80"
      />
      <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
    </ReactFlow>
  );
}

// Main comparison view component
function TreeComparisonViewInner({
  treeId1,
  treeId2,
  className,
}: TreeComparisonViewProps) {
  const { summary, comparison, isLoading, isError, error } = useTreeComparison({
    treeId1,
    treeId2,
  });

  const [summaryOpen, setSummaryOpen] = useState(true);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center min-h-[600px]", className)}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className={cn("flex items-center justify-center min-h-[600px]", className)}>
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Comparison Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error?.message || "Failed to load comparison data"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasChanges =
    summary &&
    (summary.membersOnlyInTree1Count > 0 ||
      summary.membersOnlyInTree2Count > 0 ||
      summary.membersModifiedCount > 0 ||
      summary.relationshipsOnlyInTree1Count > 0 ||
      summary.relationshipsOnlyInTree2Count > 0 ||
      summary.marriagesOnlyInTree1Count > 0 ||
      summary.marriagesOnlyInTree2Count > 0);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* Comparison Summary */}
      <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen}>
        <Card>
          <CardHeader className="py-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
                <CardTitle className="flex items-center gap-2 text-base">
                  <GitCompare className="h-5 w-5" />
                  Comparison Summary
                </CardTitle>
                {summaryOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              {!hasChanges ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No differences found between these trees
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Overview stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{summary?.tree1MemberCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Members in Tree 1</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-primary">{summary?.tree2MemberCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Members in Tree 2</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-green-600">{summary?.membersInBothCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Common Members</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-2xl font-bold text-yellow-600">{summary?.membersModifiedCount || 0}</p>
                      <p className="text-xs text-muted-foreground">Modified Members</p>
                    </div>
                  </div>

                  {/* Change badges */}
                  <div className="flex flex-wrap gap-2">
                    {summary && summary.membersOnlyInTree1Count > 0 && (
                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                        <Minus className="h-3 w-3 mr-1" />
                        {summary.membersOnlyInTree1Count} only in {summary.tree1Name}
                      </Badge>
                    )}
                    {summary && summary.membersOnlyInTree2Count > 0 && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        <Plus className="h-3 w-3 mr-1" />
                        {summary.membersOnlyInTree2Count} only in {summary.tree2Name}
                      </Badge>
                    )}
                    {summary && summary.membersModifiedCount > 0 && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                        <Edit className="h-3 w-3 mr-1" />
                        {summary.membersModifiedCount} modified
                      </Badge>
                    )}
                    {summary && (summary.relationshipsOnlyInTree1Count > 0 || summary.relationshipsOnlyInTree2Count > 0) && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                        <ArrowLeftRight className="h-3 w-3 mr-1" />
                        {summary.relationshipsOnlyInTree1Count + summary.relationshipsOnlyInTree2Count} relationship changes
                      </Badge>
                    )}
                  </div>

                  {/* Legend */}
                  <div className="flex flex-wrap gap-4 pt-2 border-t text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-muted-foreground">Only in Tree 1</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Only in Tree 2</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="text-muted-foreground">Modified</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-slate-400" />
                      <span className="text-muted-foreground">Unchanged</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Side-by-side tree comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tree 1 */}
        <Card className="overflow-hidden">
          <div className="h-[600px]" data-testid="comparison-tree-1">
            <ReactFlowProvider>
              <Tree1Panel treeId1={treeId1} treeId2={treeId2} />
            </ReactFlowProvider>
          </div>
        </Card>

        {/* Tree 2 */}
        <Card className="overflow-hidden">
          <div className="h-[600px]" data-testid="comparison-tree-2">
            <ReactFlowProvider>
              <Tree2Panel treeId1={treeId1} treeId2={treeId2} />
            </ReactFlowProvider>
          </div>
        </Card>
      </div>

      {/* Detailed Changes List */}
      {comparison && hasChanges && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5" />
              Detailed Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Members only in Tree 1 */}
              {comparison.membersOnlyInTree1.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3 text-red-700">
                    <Minus className="h-4 w-4" />
                    Only in {summary?.tree1Name} ({comparison.membersOnlyInTree1.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {comparison.membersOnlyInTree1.map((member) => (
                      <Badge
                        key={member.id}
                        variant="outline"
                        className="text-red-600 border-red-200 bg-red-50"
                      >
                        {member.firstName} {member.lastName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Members only in Tree 2 */}
              {comparison.membersOnlyInTree2.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3 text-green-700">
                    <Plus className="h-4 w-4" />
                    Only in {summary?.tree2Name} ({comparison.membersOnlyInTree2.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {comparison.membersOnlyInTree2.map((member) => (
                      <Badge
                        key={member.id}
                        variant="outline"
                        className="text-green-600 border-green-200 bg-green-50"
                      >
                        {member.firstName} {member.lastName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Modified members */}
              {comparison.membersInBoth.filter((m) => m.differences.length > 0).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium flex items-center gap-2 mb-3 text-yellow-700">
                    <Edit className="h-4 w-4" />
                    Modified Members ({comparison.membersInBoth.filter((m) => m.differences.length > 0).length})
                  </h4>
                  <div className="space-y-2">
                    {comparison.membersInBoth
                      .filter((m) => m.differences.length > 0)
                      .map(({ member1, differences }) => (
                        <div
                          key={member1.id}
                          className="flex items-start gap-2 p-2 rounded-lg bg-yellow-50 border border-yellow-200"
                        >
                          <Badge variant="outline" className="text-yellow-700 border-yellow-300 shrink-0">
                            {member1.firstName} {member1.lastName}
                          </Badge>
                          <span className="text-xs text-yellow-600">
                            Changed: {differences.join(", ")}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export with ReactFlowProvider wrapper
export function TreeComparisonView(props: TreeComparisonViewProps) {
  return <TreeComparisonViewInner {...props} />;
}
