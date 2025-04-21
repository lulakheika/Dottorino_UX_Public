import React, { useState, useCallback } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    applyNodeChanges,
    applyEdgeChanges,
    addEdge,
    MarkerType,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

// Define MORE VIVID styles and classes for different node types
const nodeColors = {
    inputOutput: { background: '#63B3ED', border: '#2C5282', text: '#1A202C' }, // Vivid Blue
    coreLogic: { background: '#68D391', border: '#2F855A', text: '#1A202C' }, // Vivid Green
    contextData: { background: '#F6E05E', border: '#B7791F', text: '#1A202C' }, // Vivid Yellow
    agents: { background: '#F687B3', border: '#B83280', text: '#1A202C' }, // Vivid Pink
    tools: { background: '#A0AEC0', border: '#4A5568', text: '#FFFFFF' }, // Gray
    external: { background: '#FC8181', border: '#C53030', text: '#1A202C' }, // Vivid Red
    helpers: { background: '#FBD38D', border: '#AF812E', text: '#1A202C' }, // Orange
    // Lighter, semi-transparent background color
    background: { background: 'rgba(237, 242, 247, 0.6)', border: '#A0AEC0', text: '#4A5568' } // Light Gray BG Area 
};

const createStyledNode = (id, label, position, typeKey, className = null, extraProps = {}) => ({
    id,
    data: { label },
    position,
    style: {
        backgroundColor: nodeColors[typeKey].background,
        borderColor: nodeColors[typeKey].border,
        color: nodeColors[typeKey].text,
        ...(extraProps.style || {})
    },
    ...(className && { className }),
    ...(typeKey === 'inputOutput' && id.includes('input') && { type: 'input' }),
    ...(typeKey === 'inputOutput' && id.includes('output') && { type: 'output' }),
    ...extraProps
});

// Significantly reorganized structure with background areas and clearer flow - MORE SPACE
const initialNodes = [
    // Background Areas (Low zIndex, not draggable/selectable) - LARGER & RESPACED
    createStyledNode('bg-user-area', 'Interazione Utente', { x: 50, y: -100 }, 'background', 'background-node',
        { draggable: false, selectable: false, style: { width: '1700px', height: '250px' } }
    ),
    createStyledNode('bg-orchestration-area', 'Orchestrazione / Agenti / Tools & Helpers', { x: 50, y: 170 }, 'background', 'background-node',
        { draggable: false, selectable: false, style: { width: '830px', height: '1150px' } } // Widened to include tools/helpers
    ),
    createStyledNode('bg-context-area', 'Contesto & Dati', { x: 900, y: 170 }, 'background', 'background-node',
        { draggable: false, selectable: false, style: { width: '800px', height: '1150px' } }
    ),
    // Removed tools area
    createStyledNode('bg-delivery-area', 'Delivery Risposta', { x: 50, y: 1340 }, 'background', 'background-node',
        { draggable: false, selectable: false, style: { width: '1700px', height: '200px' } }
    ),

    // --- Functional Nodes --- MORE SPACED OUT

    // Area: Interazione Utente
    createStyledNode('user-input', 'User Input', { x: 850, y: 0 }, 'inputOutput'),

    // Area: Orchestrazione / Agenti / Tools & Helpers
    // Orchestration
    createStyledNode('interactive-chat', 'interactive_chat()', { x: 150, y: 250 }, 'coreLogic', 'orchestrator-node'),
    createStyledNode('run-conversation', 'run_conversation()', { x: 150, y: 450 }, 'coreLogic', 'orchestrator-node'),
    // Agents
    createStyledNode('agent-triage', 'Agent: Triage', { x: 150, y: 650 }, 'agents', 'agent-node'),
    createStyledNode('agent-kb', 'Agent: Knowledge Base', { x: 150, y: 850 }, 'agents', 'agent-node'),
    createStyledNode('agent-booking', 'Agent: Prenotazioni', { x: 150, y: 1050 }, 'agents', 'agent-node'),
    // LLM Call (Conceptually linked to agents/run_conversation)
    createStyledNode('llm', 'LLM API Call', { x: 400, y: 450 }, 'external', 'external-node'),
    // Helpers & Tool Execution Logic (Now in the same area, right side)
    createStyledNode('to-input-list', 'to_input_list()', { x: 600, y: 300 }, 'helpers', 'helper-node'),
    createStyledNode('execute-tool', 'execute_tool()', { x: 600, y: 650 }, 'helpers', 'helper-node'),
    createStyledNode('handle-tool-result', 'handle_tool_result()', { x: 600, y: 1000 }, 'helpers', 'helper-node'),
    // Specific Tools (Near execute/handle)
    createStyledNode('tool-handoff', 'Tool:\nhandoff_to_agent()', { x: 600, y: 780 }, 'tools', 'tool-node'),
    createStyledNode('tool-query-kb', 'Tool:\nquery_kb()', { x: 750, y: 780 }, 'tools', 'tool-node'),
    createStyledNode('tool-get-slots', 'Tool:\nget_appt_slots()', { x: 600, y: 890 }, 'tools', 'tool-node'),

    // Area: Contesto & Dati (Right side, spaced out)
    createStyledNode('chat-context', 'ChatContext', { x: 1100, y: 500 }, 'contextData', 'context-node', { style: { width: '200px', height: '150px' } }), // Larger context node
    createStyledNode('agent-defs', 'Agent Definitions\n(Agents.py)', { x: 1450, y: 300 }, 'contextData', 'context-node'),
    createStyledNode('prompt-prefix', 'PROMPT_PREFIX', { x: 1450, y: 500 }, 'contextData', 'context-node'),

    // Area: Delivery Risposta
    createStyledNode('final-output', 'Risposta Finale', { x: 850, y: 1400 }, 'inputOutput'),
];


const arrowMarker = { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#555' };
const edgeBaseStyle = { stroke: '#555', strokeWidth: 1.5 };
const animatedEdge = { animated: true, style: { ...edgeBaseStyle, strokeWidth: 2 } };
const dashedEdgeStyle = { strokeDasharray: '5 5', strokeWidth: 1.5 };
const contextEdgeStyle = { stroke: nodeColors.contextData.border, strokeWidth: 1, strokeDasharray: '3 3' };

// Edge Label Styling - Less aggressive
const defaultLabelStyle = { fontSize: '10px', fill: '#333', fontWeight: '500' }; // Slightly larger font
const defaultLabelBgStyle = { fill: 'rgba(255, 255, 255, 0.6)', padding: '3px 5px', borderRadius: '3px' }; // More padding, less opaque

const initialEdges = [
    // --- User Input Flow ---
    { id: 'e-input-interactive', source: 'user-input', target: 'interactive-chat', markerEnd: arrowMarker, ...animatedEdge },
    { id: 'e-interactive-to-run', source: 'interactive-chat', target: 'run-conversation', label: 'invoca', type: 'step', markerEnd: arrowMarker, style: edgeBaseStyle },

    // --- Orchestration Core (run_conversation) ---
    // Getting context/config (Smoothstep for better routing in wider space)
    { id: 'e-run-reads-context', source: 'run-conversation', target: 'chat-context', label: 'legge contesto', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-run-reads-agentdefs', source: 'run-conversation', target: 'agent-defs', label: 'legge def. agente', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-run-reads-prefix', source: 'run-conversation', target: 'prompt-prefix', label: 'legge prompt prefix', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    // Formatting & Calling LLM
    { id: 'e-run-calls-format', source: 'run-conversation', target: 'to-input-list', label: 'formatta storia', type: 'smoothstep', markerEnd: arrowMarker, style: edgeBaseStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-format-reads-context', source: 'to-input-list', target: 'chat-context', label: 'legge storia', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-run-calls-llm', source: 'run-conversation', target: 'llm', label: 'chiama LLM', type: 'smoothstep', markerEnd: arrowMarker, ...animatedEdge },
    { id: 'e-llm-returns-run', source: 'llm', target: 'run-conversation', label: 'risposta LLM', type: 'smoothstep', markerEnd: arrowMarker, ...animatedEdge },

    // --- Agent Execution Examples ---
    { id: 'e-run-executes-triage', source: 'run-conversation', target: 'agent-triage', label: 'esegue', type: 'step', markerEnd: arrowMarker, style: { ...edgeBaseStyle, stroke: nodeColors.agents.border, ...dashedEdgeStyle }, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-run-executes-kb', source: 'run-conversation', target: 'agent-kb', label: 'esegue', type: 'step', markerEnd: arrowMarker, style: { ...edgeBaseStyle, stroke: nodeColors.agents.border, ...dashedEdgeStyle }, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-run-executes-booking', source: 'run-conversation', target: 'agent-booking', label: 'esegue', type: 'step', markerEnd: arrowMarker, style: { ...edgeBaseStyle, stroke: nodeColors.agents.border, ...dashedEdgeStyle }, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },

    // --- LLM Response Processing ---
    // Text Response -> Update Context
    { id: 'e-run-updates-context-text', source: 'run-conversation', target: 'chat-context', label: 'aggiorna contesto (text)', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    // Tool Call Response -> Update Context & Execute Tool
    { id: 'e-run-updates-context-toolcall', source: 'run-conversation', target: 'chat-context', label: 'aggiorna contesto (tool call)', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-run-calls-exec-tool', source: 'run-conversation', target: 'execute-tool', label: 'chiama execute_tool', type: 'smoothstep', markerEnd: arrowMarker, style: edgeBaseStyle },

    // --- Tool Execution Flow (in Orchestration Area) ---
    { id: 'e-exec-calls-handle', source: 'execute-tool', target: 'handle-tool-result', label: 'passa output', type: 'step', markerEnd: arrowMarker, style: edgeBaseStyle },
    { id: 'e-handle-reads-context', source: 'handle-tool-result', target: 'chat-context', label: 'legge contesto', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-handle-updates-context', source: 'handle-tool-result', target: 'chat-context', label: 'aggiorna contesto (tool result)', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-handle-returns-run', source: 'handle-tool-result', target: 'run-conversation', label: 'ritorna prossimo agente', type: 'smoothstep', markerEnd: arrowMarker, style: edgeBaseStyle },
    // Connect execute_tool to actual tools
    { id: 'e-exec-tool-handoff', source: 'execute-tool', target: 'tool-handoff', label: 'chiama handoff', type: 'step', markerEnd: arrowMarker, style: dashedEdgeStyle },
    { id: 'e-exec-tool-query', source: 'execute-tool', target: 'tool-query-kb', label: 'chiama query_kb', type: 'step', markerEnd: arrowMarker, style: dashedEdgeStyle },
    { id: 'e-exec-tool-slots', source: 'execute-tool', target: 'tool-get-slots', label: 'chiama get_slots', type: 'step', markerEnd: arrowMarker, style: dashedEdgeStyle },

    // --- Agent -> Tool Interaction Examples (Conceptual) ---
    { id: 'e-triage-uses-handoff', source: 'agent-triage', target: 'tool-handoff', label: 'usa tool (via LLM)', type: 'smoothstep', markerEnd: arrowMarker, style: { ...edgeBaseStyle, stroke: nodeColors.tools.border, ...dashedEdgeStyle }, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-handoff-informs-handle', source: 'tool-handoff', target: 'handle-tool-result', label: 'output informa handler', type: 'step', markerEnd: arrowMarker, style: dashedEdgeStyle },
    { id: 'e-kb-uses-query', source: 'agent-kb', target: 'tool-query-kb', label: 'usa tool (via LLM)', type: 'smoothstep', markerEnd: arrowMarker, style: { ...edgeBaseStyle, stroke: nodeColors.tools.border, ...dashedEdgeStyle }, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },
    { id: 'e-booking-uses-slots', source: 'agent-booking', target: 'tool-get-slots', label: 'usa tool (via LLM)', type: 'smoothstep', markerEnd: arrowMarker, style: { ...edgeBaseStyle, stroke: nodeColors.tools.border, ...dashedEdgeStyle }, labelStyle: defaultLabelStyle, labelBgStyle: defaultLabelBgStyle },

    // --- Delivery Flow ---
    { id: 'e-interactive-final', source: 'interactive-chat', target: 'final-output', label: 'stampa risposta finale', type: 'step', markerEnd: arrowMarker, style: edgeBaseStyle },
    { id: 'e-context-provides-final', source: 'chat-context', target: 'final-output', label: 'fornisce agg_response', type: 'smoothstep', markerEnd: arrowMarker, style: contextEdgeStyle },
];

function FlowDiagram() {
    const [nodes, setNodes] = useState(initialNodes);
    const [edges, setEdges] = useState(initialEdges);

    const onNodesChange = useCallback(
        (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
        [setNodes]
    );
    const onEdgesChange = useCallback(
        (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
        [setEdges]
    );
    const onConnect = useCallback(
        (connection) => setEdges((eds) => addEdge({
            ...connection,
            markerEnd: arrowMarker,
            style: edgeBaseStyle,
            labelStyle: defaultLabelStyle,
            labelBgStyle: defaultLabelBgStyle
        }, eds)),
        [setEdges]
    );

    // Set large default viewport for 4k - user can still zoom/pan
    const defaultViewport = { x: 0, y: 0, zoom: 0.6 };

    return (
        <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            // fitView // Remove fitView to use default viewport
            defaultViewport={defaultViewport} // Set initial viewport
            minZoom={0.1} // Allow zooming out further
            attributionPosition="bottom-left"
            defaultEdgeOptions={{
                markerEnd: arrowMarker,
                style: edgeBaseStyle,
                labelStyle: defaultLabelStyle,
                labelBgStyle: defaultLabelBgStyle
            }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
        >
            <Controls />
            <Background variant="dots" gap={20} size={1} color="#ccc" /> {/* Larger gap */}
        </ReactFlow>
    );
}

export default FlowDiagram; 