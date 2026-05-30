import {
  Table,
  Button,
  Heading,
  HStack,
  IconButton,
  Stack,
  Text,
  Box,
  Flex,
  Spinner,
  Center,
  Input,
} from '@chakra-ui/react';
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from 'react-icons/lu';
import { useEffect, useState } from 'react';
import { sportsService } from '../services/sports';
import type { SportDTO, CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';
import {
  DialogRoot,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  DialogActionTrigger,
  DialogCloseTrigger,
} from '../components/ui/dialog';
import { Field } from '../components/ui/field';

export function SportsView() {
  const [sports, setSports] = useState<SportDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSportId, setEditingSportId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreateSportRequest>({
    name: '',
    description: '',
    maxCapacity: 0,
    additionalPrice: 0,
    requiresMedicalCertificate: false,
  });

  const fetchSports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await sportsService.getAll();
      setSports(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los deportes');
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingSportId(null);
    setError(null);
    setFormData({
      name: '',
      description: '',
      maxCapacity: 0,
      additionalPrice: 0,
      requiresMedicalCertificate: false,
    });
    setIsDialogOpen(true);
  };

  const openEditModal = (sport: SportDTO) => {
    setEditingSportId(sport.id);
    setError(null);
    setFormData({
      name: sport.name,
      description: sport.description,
      maxCapacity: sport.maxCapacity,
      additionalPrice: sport.additionalPrice,
      requiresMedicalCertificate: sport.requiresMedicalCertificate,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingSportId) {
        await sportsService.update(editingSportId, {
          description: formData.description,
          maxCapacity: formData.maxCapacity,
          additionalPrice: formData.additionalPrice,
          requiresMedicalCertificate: formData.requiresMedicalCertificate,
        } as UpdateSportRequest);
      } else {
        await sportsService.create(formData);
      }
      setIsDialogOpen(false);
      fetchSports();
    } catch (err: any) {
      setError(err.message || 'Error al guardar el deporte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;
    setIsDeleting(confirmDeleteId);
    try {
      await sportsService.delete(confirmDeleteId);
      setConfirmDeleteId(null);
      fetchSports();
    } catch (err: any) {
      setConfirmDeleteId(null);
      setError(err.message || 'Error al eliminar el deporte');
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    fetchSports();
  }, []);

  return (
    <>
      <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
        <Stack gap="8">
          <Flex justify="space-between" align="center">
            <Stack gap="1">
              <Heading size="2xl" fontWeight="bold">
                Deportes
              </Heading>
              <Text color="fg.muted" fontSize="md">
                Gestión de los deportes disponibles en el club.
              </Text>
            </Stack>
            <HStack gap="3">
              <Button variant="outline" onClick={fetchSports} disabled={isLoading}>
                <LuRefreshCw /> Actualizar
              </Button>
              <Button colorPalette="blue" size="md" onClick={openCreateModal}>
                <LuPlus /> Crear Deporte
              </Button>
            </HStack>
          </Flex>

          {/* Modal crear/editar */}
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>
                  {editingSportId ? 'Editar Deporte' : 'Crear Nuevo Deporte'}
                </DialogTitle>
              </DialogHeader>
              <DialogBody>
                <Stack gap="4">
                  {!editingSportId && (
                    <Field label="Nombre del Deporte" required>
                      <Input
                        placeholder="Ej. Fútbol"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </Field>
                  )}
                  <Field label="Descripción" required>
                    <Input
                      placeholder="Ej. El rey de los deportes"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      required
                    />
                  </Field>
                  <Field label="Cupo Máximo" required>
                    <Input
                      type="number"
                      min="1"
                      value={formData.maxCapacity}
                      onChange={(e) =>
                        setFormData({ ...formData, maxCapacity: parseInt(e.target.value) })
                      }
                      required
                    />
                  </Field>
                  <Field label="Precio Adicional">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.additionalPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, additionalPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </Field>
                  <Box display="flex" alignItems="center" gap="3">
                    <input
                      type="checkbox"
                      checked={formData.requiresMedicalCertificate}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          requiresMedicalCertificate: e.target.checked,
                        })
                      }
                      style={{ cursor: 'pointer' }}
                    />
                    <Text cursor="pointer">Requiere certificado médico</Text>
                  </Box>
                </Stack>
              </DialogBody>
              <DialogFooter>
                <DialogActionTrigger asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogActionTrigger>
                <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                  {editingSportId ? 'Guardar Cambios' : 'Crear'}
                </Button>
              </DialogFooter>
              <DialogCloseTrigger />
            </form>
          </DialogContent>

          {error && (
            <Box
              p="4"
              bg="red.50"
              color="red.700"
              borderRadius="md"
              border="1px solid"
              borderColor="red.200"
            >
              <Text fontWeight="bold">Error:</Text>
              <Text>{error}</Text>
            </Box>
          )}

          <Box
            bg="bg.panel"
            borderRadius="xl"
            boxShadow="sm"
            borderWidth="1px"
            overflow="hidden"
            minH="300px"
            position="relative"
          >
            {isLoading ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Spinner size="xl" color="blue.500" />
                  <Text color="fg.muted">Cargando deportes...</Text>
                </Stack>
              </Center>
            ) : sports.length === 0 ? (
              <Center h="300px">
                <Stack align="center" gap="4">
                  <Text color="fg.muted">No hay deportes registrados.</Text>
                  <Button variant="ghost" onClick={fetchSports}>
                    Reintentar
                  </Button>
                </Stack>
              </Center>
            ) : (
              <Table.Root size="md" variant="line" interactive>
                <Table.Header>
                  <Table.Row bg="bg.muted/50">
                    <Table.ColumnHeader py="4">Nombre</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Descripción</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Cupo Máximo</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Precio Adicional</Table.ColumnHeader>
                    <Table.ColumnHeader py="4">Médico</Table.ColumnHeader>
                    <Table.ColumnHeader py="4" textAlign="end">
                      Acciones
                    </Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {sports.map((sport) => (
                    <Table.Row key={sport.id} _hover={{ bg: 'bg.muted/30' }}>
                      <Table.Cell fontWeight="semibold" color="fg.emphasized">
                        {sport.name}
                      </Table.Cell>
                      <Table.Cell color="fg.muted">{sport.description}</Table.Cell>
                      <Table.Cell color="fg.muted">{sport.maxCapacity}</Table.Cell>
                      <Table.Cell color="fg.muted">${sport.additionalPrice.toFixed(2)}</Table.Cell>
                      <Table.Cell color="fg.muted">
                        {sport.requiresMedicalCertificate ? '✓' : '✗'}
                      </Table.Cell>
                      <Table.Cell textAlign="end">
                        <HStack gap="2" justify="flex-end">
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Editar deporte"
                            onClick={() => openEditModal(sport)}
                          >
                            <LuPencil />
                          </IconButton>
                          <IconButton
                            variant="ghost"
                            size="sm"
                            aria-label="Eliminar deporte"
                            onClick={() => handleDeleteClick(sport.id)}
                            loading={isDeleting === sport.id}
                            colorPalette="red"
                          >
                            <LuTrash2 />
                          </IconButton>
                        </HStack>
                      </Table.Cell>
                    </Table.Row>
                  ))}
                </Table.Body>
              </Table.Root>
            )}
          </Box>
        </Stack>
      </DialogRoot>

      <DialogRoot
        open={confirmDeleteId !== null}
        onOpenChange={(e) => { if (!e.open) setConfirmDeleteId(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <Text>¿Estás seguro de que querés eliminar este deporte? Esta acción no se puede deshacer.</Text>
          </DialogBody>
          <DialogFooter>
            <DialogActionTrigger asChild>
              <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
            </DialogActionTrigger>
            <Button colorPalette="red" loading={isDeleting !== null} onClick={handleDeleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>
          <DialogCloseTrigger />
        </DialogContent>
      </DialogRoot>
    </>
  );
}
