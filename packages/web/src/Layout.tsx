import { Provider } from './components/ui/provider';
import { Box, Container, Flex, Text, HStack } from '@chakra-ui/react';

import { Outlet, Link as RouterLink } from "react-router";

function Layout() {
    return (
        <Provider>
            <Box as="nav" borderBottomWidth="1px" py="4" px="8" bg="bg.panel" boxShadow="sm" position="sticky" top="0" zIndex="docked">
                <Flex justify="space-between" align="center" maxW="7xl" mx="auto">
                    <RouterLink to="/">
                        <Text 
                            fontSize="2xl" 
                            fontWeight="bold" 
                            bgGradient="to-r" 
                            gradientFrom="blue.600" 
                            gradientTo="cyan.500" 
                            bgClip="text"
                        >
                            Alentapp
                        </Text>
                    </RouterLink>
                    <HStack gap="10">
                        <RouterLink to="/members">
                            <Text 
                                fontWeight="semibold" 
                                fontSize="sm" 
                                textTransform="uppercase" 
                                letterSpacing="wider"
                                color="fg.muted"
                                _hover={{ color: "blue.500", textDecoration: "none" }}
                            >
                                Miembros
                            </Text>
                        </RouterLink>
                        <RouterLink to="/payments">
                            <Text
                                fontWeight="semibold" 
                                fontSize="sm" 
                                textTransform="uppercase" 
                                letterSpacing="wider"
                                color="fg.muted"
                                _hover={{ color: "blue.500", textDecoration: "none" }}
                            >
                                Pagos y Cuotas
                            </Text>
                        </RouterLink> {/* <--- ¡ESTE ERA EL CIERRE QUE FALTABA! */}
                        <RouterLink to="/lockers">
                            <Text
                                fontWeight="semibold"
                                fontSize="sm"
                                textTransform="uppercase"
                                letterSpacing="wider"
                                color="fg.muted"
                                _hover={{ color: "blue.500", textDecoration: "none" }}
                            >
                                Casilleros
                            </Text>
                        </RouterLink>
                        <RouterLink to="/equipment-loans">
                            <Text
                                fontWeight="semibold"
                                fontSize="sm"
                                textTransform="uppercase"
                                letterSpacing="wider"
                                color="fg.muted"
                                _hover={{ color: "blue.500", textDecoration: "none" }}
                            >
                                Préstamos
                            </Text>
                        </RouterLink>

                    </HStack>
                </Flex>
            </Box>
            <Container maxW="7xl" py="10">
                <Outlet />
            </Container>
        </Provider>
    );
}
export default Layout;