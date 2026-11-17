// Completed-turn cards live outside DSH's collapsible tool process.
import { useSyncExternalStore } from "react";
import { A2uiToolView, A2uiUpdateView } from "./toolview.jsx";

function containsCall(block, callId) {
	return block.callId === callId || (block.subCalls ?? []).some((child) => containsCall(child, callId));
}

function hasTail(snapshot, callId) {
	const nodes = snapshot.nodes?.values?.() ?? [];
	const tool = nodes.find((node) => node.kind === "tool-call" && containsCall(node.data.root, callId));
	const turn = tool?.location?.turn?.turn;
	return turn !== undefined && nodes.some((node) => node.kind === "turn-tail" && node.data.turn === turn);
}

// Older hosts do not supply useChat; keep their existing tool-row rendering.
export function A2uiInlineView(props) {
	return typeof props.useChat === "function" ? <ChatInlineView {...props} /> : <A2uiToolView {...props} />;
}

function ChatInlineView(props) {
	const inTail = props.useChat((snapshot) => hasTail(snapshot, props.callId));
	return inTail && "kind" in props.block && props.block.isError !== true
		? <div className="dsha2ui-skeleton">▤ {props.t("card.title")}</div>
		: <A2uiToolView {...props} />;
}

function settledCalls(tools, through) {
	const calls = [];
	const seen = new Set();
	const visit = (block) => {
		if (seen.has(block.callId)) return;
		seen.add(block.callId);
		if (block.kind === "tool-result" && block.isError !== true && block.seq <= through
			&& ["a2ui_render", "a2ui_update"].includes(block.call?.name)) calls.push(block);
		for (const child of block.subCalls ?? []) visit(child);
	};
	for (const tool of tools) visit(tool.root);
	return calls;
}

export function A2uiTurnTail(props) {
	const nodes = props.useChat((snapshot) => snapshot.nodes);
	const source = nodes.turnDataSource(props.turn.turn, "tool-call");
	const tools = useSyncExternalStore(source.subscribe, source.getSnapshot);
	const calls = settledCalls(tools, props.turn.end?.seq ?? props.seq);
	if (calls.length === 0) return null;
	return <div data-a2ui-turn={props.turn.turn}>
		{calls.map((block) => block.call.name === "a2ui_render"
			? <A2uiToolView key={block.callId} {...props} callId={block.callId} block={block} />
			: <A2uiUpdateView key={block.callId} {...props} callId={block.callId} block={block} quiet />)}
	</div>;
}
