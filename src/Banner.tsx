import { Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

interface BannerProps {
    version?: string;
}

export const Banner = ({ version }: BannerProps) => (
    <>
        <Gradient name="teen">
            <BigText text="k8s-andresnator" />
        </Gradient>
        <Text color="yellow">Kubernetes Resource Clone Tool (Sandbox environment)</Text>
        {version && <Text color="gray">Version: v{version}</Text>}
        <Text> </Text>
    </>
);
