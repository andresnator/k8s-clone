import React from 'react';
import { Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

export const Banner = () => (
    <>
        <Gradient name="cristal">
            <BigText text="K8s Migrator" />
        </Gradient>
        <Text color="yellow">Kubernetes Resource Migration Tool</Text>
        <Text> </Text>
    </>
);
