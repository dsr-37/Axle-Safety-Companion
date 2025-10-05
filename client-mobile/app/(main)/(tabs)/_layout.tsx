import { Tabs } from 'expo-router';
import { Image, StyleSheet, View } from 'react-native';
import { ClayColors } from '../../../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const tabScreens = [
    { name: 'home', title: 'Home', icon: require('../../../assets/images/home.png') },
    { name: 'checklist', title: 'Checklist', icon: require('../../../assets/images/checklist.png') },
    { name: 'insights', title: 'Insights', icon: require('../../../assets/images/insights.png') },
    { name: 'profile', title: 'Profile', icon: require('../../../assets/images/profile.png') },
];

export default function TabsLayout() {
    const { bottom } = useSafeAreaInsets();
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: ClayColors.mint,
                tabBarInactiveTintColor: 'rgba(40, 24, 82, 0.8)',
                tabBarStyle: {
                    backgroundColor: 'rgba(232, 218, 255, 0.92)',
                    borderTopWidth: 0,
                    height: 54 + bottom,
                    paddingBottom: bottom + 4,
                    paddingTop: 4,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
            }}
        >
            {tabScreens.map((screen) => (
                <Tabs.Screen
                    key={screen.name}
                    name={screen.name}
                    options={{
                        title: screen.title,
                        tabBarIcon: ({ focused, size }) => (
                            <View
                                style={[
                                    styles.iconWrapper,
                                    focused && styles.iconWrapperActive,
                                ]}
                            >
                                <Image
                                    source={screen.icon}
                                    style={[
                                        styles.icon,
                                        { width: size, height: size },
                                        focused ? styles.iconActive : styles.iconInactive,
                                    ]}
                                    resizeMode="contain"
                                />
                            </View>
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
}

const styles = StyleSheet.create({
    iconWrapper: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconWrapperActive: {
        backgroundColor: 'rgba(58, 217, 177, 0.25)',
    },
    icon: {
        width: 24,
        height: 24,
    },
    iconActive: {
        opacity: 1,
    },
    iconInactive: {
        opacity: 0.6,
    },
});