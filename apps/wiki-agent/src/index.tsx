import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';
import Spinner from 'ink-spinner';

const WikiAgent = () => {
    const { exit } = useApp();
    const [status, setStatus] = useState('initializing');

    useEffect(() => {
        const timer1 = setTimeout(() => {
            setStatus('connecting');
        }, 1500);

        const timer2 = setTimeout(() => {
            setStatus('ready');
        }, 3000);

        return () => {
            clearTimeout(timer1);
            clearTimeout(timer2);
        };
    }, []);

    useEffect(() => {
        if (status === 'ready') {
            // Simulate waiting for user input or doing work
            // For this demo, we just exit after a few seconds
            const timer = setTimeout(() => {
                exit();
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [status, exit]);

    return (
        <Box flexDirection="column" padding={1}>
            <Gradient name="mind">
                <BigText text="Wiki Agent" />
            </Gradient>

            <Box borderStyle="single" borderColor="green" padding={1} flexDirection="column">
                {status === 'initializing' && (
                    <Box>
                        <Text color="green"><Spinner type="dots" /> Initializing Wiki Agent...</Text>
                    </Box>
                )}

                {status === 'connecting' && (
                    <Box>
                        <Text color="yellow"><Spinner type="arc" /> Connecting to knowledge base...</Text>
                    </Box>
                )}

                {status === 'ready' && (
                    <Box flexDirection="column">
                        <Text color="cyan">✓ Ready! Listening for queries...</Text>
                        <Text dimColor>Simulating agent activity... (will exit automatically)</Text>
                    </Box>
                )}
            </Box>
        </Box>
    );
};

render(<WikiAgent />);
