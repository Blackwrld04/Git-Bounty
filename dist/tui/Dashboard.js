import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { GibworkService } from '../core/gibwork.js';
import { loadConfig } from '../core/config.js';
export const DashboardApp = () => {
    const { exit } = useApp();
    const [tasks, setTasks] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [statusMessage, setStatusMessage] = useState('Use ↑/↓ to navigate, [c] to claim, [q] to exit');
    const config = loadConfig();
    useEffect(() => {
        async function fetchBounties() {
            try {
                const gibwork = new GibworkService(undefined, config.network === 'production');
                const list = await gibwork.listAvailableTasks(1, 15);
                setTasks(list);
                setLoading(false);
            }
            catch (err) {
                setStatusMessage(`Error loading bounties: ${err.message}`);
                setLoading(false);
            }
        }
        fetchBounties();
    }, []);
    useInput((input, key) => {
        if (input === 'q' || (key.ctrl && input === 'c')) {
            exit();
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(prev => (prev > 0 ? prev - 1 : tasks.length - 1));
        }
        else if (key.downArrow) {
            setSelectedIndex(prev => (prev < tasks.length - 1 ? prev + 1 : 0));
        }
        else if (input === 'c' && tasks.length > 0) {
            const selected = tasks[selectedIndex];
            setStatusMessage(`To claim "${selected.title.slice(0, 20)}", run: git bounty claim ${selected.taskId}`);
        }
    });
    const selectedTask = tasks[selectedIndex];
    return (React.createElement(Box, { flexDirection: "column", padding: 1, borderStyle: "round", borderColor: "green" },
        React.createElement(Box, { justifyContent: "space-between", marginBottom: 1 },
            React.createElement(Text, { bold: true, color: "green" }, "\u26A1 GIT-BOUNTY TERMINAL DASHBOARD"),
            React.createElement(Text, { color: "cyan" },
                "Network: [",
                config.network.toUpperCase(),
                "]")),
        loading ? (React.createElement(Text, { color: "yellow" }, "Loading active bounties from Solana Gibwork protocol...")) : tasks.length === 0 ? (React.createElement(Text, { color: "yellow" }, "No open bounties found on this network.")) : (React.createElement(Box, { flexDirection: "row" },
            React.createElement(Box, { flexDirection: "column", width: "45%", marginRight: 2 },
                React.createElement(Text, { bold: true, underline: true, color: "white" },
                    "Available Bounties (",
                    tasks.length,
                    ")"),
                tasks.map((task, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (React.createElement(Box, { key: task.taskId },
                        React.createElement(Text, { color: isSelected ? 'green' : 'white', bold: isSelected },
                            isSelected ? '▶ ' : '  ',
                            task.title.slice(0, 25).padEnd(26)),
                        React.createElement(Text, { color: "yellow", bold: true },
                            task.rewardAmount,
                            " ",
                            task.tokenSymbol)));
                })),
            React.createElement(Box, { flexDirection: "column", width: "55%", borderStyle: "single", borderColor: "gray", padding: 1 }, selectedTask && (React.createElement(React.Fragment, null,
                React.createElement(Text, { bold: true, color: "green" }, selectedTask.title),
                React.createElement(Box, { marginY: 1 },
                    React.createElement(Text, { color: "gray" }, "Reward: "),
                    React.createElement(Text, { bold: true, color: "yellow" },
                        selectedTask.rewardAmount,
                        " ",
                        selectedTask.tokenSymbol)),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "gray" }, "Task ID: "),
                    React.createElement(Text, { color: "cyan" }, selectedTask.taskId)),
                React.createElement(Box, { marginBottom: 1 },
                    React.createElement(Text, { color: "gray" }, "Tags: "),
                    React.createElement(Text, { color: "magenta" }, selectedTask.tags.length > 0 ? selectedTask.tags.join(', ') : 'None')),
                React.createElement(Box, { flexDirection: "column", marginTop: 1 },
                    React.createElement(Text, { bold: true, color: "white" }, "Description Preview:"),
                    React.createElement(Text, { color: "gray" },
                        selectedTask.content.replace(/<[^>]+>/g, ' ').slice(0, 200),
                        "..."))))))),
        React.createElement(Box, { marginTop: 1, borderStyle: "classic", borderColor: "gray", paddingX: 1 },
            React.createElement(Text, { color: "cyan" }, statusMessage))));
};
export function launchDashboard() {
    render(React.createElement(DashboardApp, null));
}
//# sourceMappingURL=Dashboard.js.map