"use client";

import { ChevronDown, ChevronRight, Layers3 } from "lucide-react";
import { useMemo, useState } from "react";

type ExplosionRow = {
  level: number;
  parent_product_id: string;
  component_product_id: string;
  component_sku: string;
  component_name: string;
  required_qty: number;
  uom: string;
};

type TreeNode = ExplosionRow & { children: TreeNode[] };

export function BomTreeViewer({ rows }: { rows: ExplosionRow[] }) {
  const tree = useMemo(() => buildTree(rows), [rows]);

  if (tree.length === 0) {
    return <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">No active BOM explosion is available for the selected product.</div>;
  }

  return <div className="space-y-3">{tree.map((node) => <BomTreeNode key={`${node.parent_product_id}-${node.component_product_id}-${node.level}`} node={node} />)}</div>;
}

function BomTreeNode({ node }: { node: TreeNode }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setExpanded((current) => !current)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          {hasChildren ? expanded ? <ChevronDown className="h-4 w-4 text-slate-500" /> : <ChevronRight className="h-4 w-4 text-slate-500" /> : <Layers3 className="h-4 w-4 text-slate-400" />}
          <div>
            <p className="text-sm font-semibold text-slate-950">{node.component_sku}</p>
            <p className="text-sm text-slate-500">{node.component_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-right text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Level</p>
            <p className="font-medium text-slate-800">{node.level}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Required</p>
            <p className="font-medium text-slate-800">{node.required_qty} {node.uom}</p>
          </div>
        </div>
      </button>
      {expanded && hasChildren ? <div className="space-y-3 border-t border-slate-100 bg-slate-50 px-4 py-4">{node.children.map((child) => <div key={`${child.parent_product_id}-${child.component_product_id}-${child.level}`} className="ml-4 border-l border-slate-200 pl-4"><BomTreeNode node={child} /></div>)}</div> : null}
    </div>
  );
}

function buildTree(rows: ExplosionRow[]): TreeNode[] {
  const grouped = new Map<string, TreeNode[]>();
  const nodes = rows.map<TreeNode>((row) => ({ ...row, children: [] }));

  nodes.forEach((node) => {
    const key = `${node.parent_product_id}:${node.level}`;
    const current = grouped.get(key) ?? [];
    current.push(node);
    grouped.set(key, current);
  });

  const roots = nodes.filter((node) => node.level === 1);

  const attachChildren = (parent: TreeNode) => {
    const children = grouped.get(`${parent.component_product_id}:${parent.level + 1}`) ?? [];
    parent.children = children;
    children.forEach(attachChildren);
  };

  roots.forEach(attachChildren);
  return roots;
}
