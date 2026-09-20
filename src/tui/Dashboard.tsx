import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { GibworkService } from '../core/gibwork.js';
import { loadConfig } from '../core/config.js';
import { BountyTaskSummary } from '../types/bounty.js';

export const DashboardApp: React.FC = () => {
  const { exit } = useApp();
  const [tasks, setTasks] = useState<BountyTaskSummary[]>([]);
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
      } catch (err: any) {
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
    } else if (key.downArrow) {
      setSelectedIndex(prev => (prev < tasks.length - 1 ? prev + 1 : 0));
    } else if (input === 'c' && tasks.length > 0) {
      const selected = tasks[selectedIndex];
      setStatusMessage(`To claim "${selected.title.slice(0, 20)}", run: git bounty claim ${selected.taskId}`);
    }
  });

  const selectedTask = tasks[selectedIndex];

  return (
    <Box flexDirection="column" padding={1} borderStyle="round" borderColor="green">
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text bold color="green">
          ⚡ GIT-BOUNTY TERMINAL DASHBOARD
        </Text>
        <Text color="cyan">
          Network: [{config.network.toUpperCase()}]
        </Text>
      </Box>

      {loading ? (
        <Text color="yellow">Loading active bounties from Solana Gibwork protocol...</Text>
      ) : tasks.length === 0 ? (
        <Text color="yellow">No open bounties found on this network.</Text>
      ) : (
        <Box flexDirection="row">
          {/* Left Column: Task List */}
          <Box flexDirection="column" width="45%" marginRight={2}>
            <Text bold underline color="white">
              Available Bounties ({tasks.length})
            </Text>
            {tasks.map((task, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <Box key={task.taskId}>
                  <Text color={isSelected ? 'green' : 'white'} bold={isSelected}>
                    {isSelected ? '▶ ' : '  '}
                    {task.title.slice(0, 25).padEnd(26)}
                  </Text>
                  <Text color="yellow" bold>
                    {task.rewardAmount} {task.tokenSymbol}
                  </Text>
                </Box>
              );
            })}
          </Box>

          {/* Right Column: Selected Task Details */}
          <Box flexDirection="column" width="55%" borderStyle="single" borderColor="gray" padding={1}>
            {selectedTask && (
              <>
                <Text bold color="green">
                  {selectedTask.title}
                </Text>
                <Box marginY={1}>
                  <Text color="gray">Reward: </Text>
                  <Text bold color="yellow">
                    {selectedTask.rewardAmount} {selectedTask.tokenSymbol}
                  </Text>
                </Box>
                <Box marginBottom={1}>
                  <Text color="gray">Task ID: </Text>
                  <Text color="cyan">{selectedTask.taskId}</Text>
                </Box>
                <Box marginBottom={1}>
                  <Text color="gray">Tags: </Text>
                  <Text color="magenta">
                    {selectedTask.tags.length > 0 ? selectedTask.tags.join(', ') : 'None'}
                  </Text>
                </Box>
                <Box flexDirection="column" marginTop={1}>
                  <Text bold color="white">Description Preview:</Text>
                  <Text color="gray">
                    {selectedTask.content.replace(/<[^>]+>/g, ' ').slice(0, 200)}...
                  </Text>
                </Box>
              </>
            )}
          </Box>
        </Box>
      )}

      {/* Footer / Status Bar */}
      <Box marginTop={1} borderStyle="classic" borderColor="gray" paddingX={1}>
        <Text color="cyan">{statusMessage}</Text>
      </Box>
    </Box>
  );
};

export function launchDashboard() {
  render(<DashboardApp />);
}
