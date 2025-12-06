import { Text } from 'ink';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';

interface BannerProps {
    version?: string;
}

export const Banner = ({ version }: BannerProps) => (
    <>
        <Gradient name="teen">
            <BigText text="K8s Clone" />
        </Gradient>
        <Text color="yellow">Kubernetes Resource Migration Tool</Text>
        {version && <Text color="gray">Version: v{version}</Text>}
        <Text> </Text>
    </>
);
