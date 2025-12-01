import React from 'react';
import { Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

export const Banner = () => (
    <>
        <Gradient name="teen">
            <BigText text="K8s Clone" />
        </Gradient>
        <Text color="yellow">Kubernetes Resource Migration Tool</Text>
        <Text> </Text>
    </>
);
