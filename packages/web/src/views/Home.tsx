import { LuUsers, LuWarehouse, LuCreditCard, LuPackage } from "react-icons/lu";
import { Box, SimpleGrid, Heading, Text, VStack } from "@chakra-ui/react";
import { SectionCard } from "../components/SectionCard";

export function HomeView() {
  return (
    <Box>
      <VStack gap="6" align="flex-start" mb="12">
        <Heading 
          size="4xl" 
          fontWeight="extrabold" 
          letterSpacing="tight"
          bgGradient="to-r"
          gradientFrom="blue.600"
          gradientTo="cyan.400"
          bgClip="text"
        >
          Bienvenido a Alentapp
        </Heading>
        <Text fontSize="xl" color="fg.muted" maxW="2xl">
          El panel de administración central para gestionar todos los aspectos de tu club. 
          Selecciona una sección a continuación para comenzar.
        </Text>
      </VStack>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap="8">
        <SectionCard 
          title="Miembros"
          description="Administra el padrón de socios, sus categorías, estados de cuenta y datos personales."
          to="/members"
          icon={LuUsers}
        />

        {/* Tarjeta de Pagos */}
        <SectionCard 
          title="Pagos y Cuotas"
          description="Registra los pagos de los socios, controla los vencimientos y el estado de las cuotas."
          to="/payments"
          icon={LuCreditCard}
        />
          <SectionCard 
          title="Casilleros"
          description="Gestioná el inventario de casilleros del club, su estado y asignación a socios."
          to="/lockers"
          icon={LuWarehouse}
        />

        <SectionCard 
          title="Préstamos de Equipamiento"
          description="Registrá y gestioná el equipamiento deportivo prestado a los socios."
          to="/equipment-loans"
          icon={LuPackage}
        />

        {/* Future sections can be added here following the same pattern */}
        <Box 
          p="6" 
          bg="bg.muted/30" 
          borderRadius="2xl" 
          borderWidth="1px" 
          borderColor="border.subtle"
          borderStyle="dashed"
          display="flex"
          alignItems="center"
          justifyContent="center"
          minH="250px"
        >
          <VStack>
            <Text color="fg.muted" fontWeight="medium">Próximamente nuevas secciones</Text>
          </VStack>
        </Box>
      </SimpleGrid>
    </Box>
  );
}