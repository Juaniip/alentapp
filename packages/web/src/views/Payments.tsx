import { 
  Table, Button, Heading, HStack, IconButton, Stack, Text, Box, Flex, Spinner, Center, Input
} from "@chakra-ui/react";
import { LuPlus, LuPencil, LuTrash2, LuRefreshCw } from "react-icons/lu";
import { useEffect, useState, useMemo } from "react";
import { paymentsService } from "../services/payments";
import { membersService } from "../services/members"; // Necesitamos a los socios para el formulario
import type { PaymentDTO, CreatePaymentRequest, UpdatePaymentRequest, PaymentStatus, MemberDTO } from "@alentapp/shared";
import { 
  DialogRoot, DialogContent, DialogHeader, DialogTitle, DialogBody, DialogFooter, DialogActionTrigger, DialogCloseTrigger
} from "../components/ui/dialog";
import { Field } from "../components/ui/field";
import { 
  SelectRoot, SelectTrigger, SelectValueText, SelectContent, SelectItem, createListCollection 
} from "../components/ui/select";

const statusCategories = createListCollection({
  items: [
    { label: "Pending", value: "Pending" },
    { label: "Paid", value: "Paid" },
    { label: "Canceled", value: "Canceled" },
  ],
});

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentDTO[]>([]);
  const [members, setMembers] = useState<MemberDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);

  const [formData, setFormData] = useState<CreatePaymentRequest & { status?: PaymentStatus }>({
    member_id: "",
    amount: "" as unknown as number,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    due_date: "",
  });

  const membersCollection = useMemo(() => createListCollection({
    items: members.map(m => ({ label: `${m.name} (${m.dni})`, value: m.id }))
  }), [members]);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [paymentsData, membersData] = await Promise.all([
        paymentsService.getAll(),
        membersService.getAll()
      ]);
      setPayments(paymentsData);
      setMembers(membersData);
    } catch (err: any) {
      setError(err.message || "Error al cargar los datos");
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPaymentId(null);
    setFormData({ 
      member_id: "", 
      amount: "" as unknown as number, 
      month: new Date().getMonth() + 1, 
      year: new Date().getFullYear(), 
      due_date: "" 
    });
    setIsDialogOpen(true);
  };

  const openEditModal = (payment: PaymentDTO) => {
    setEditingPaymentId(payment.id);
    setFormData({
      member_id: payment.member_id,
      amount: payment.amount,
      month: payment.month,
      year: payment.year,
      due_date: payment.due_date,
      status: payment.status,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingPaymentId) {
        await paymentsService.update(editingPaymentId, {
          amount: Number(formData.amount),
          due_date: formData.due_date,
          status: formData.status
        } as UpdatePaymentRequest);
      } else {
        await paymentsService.create({
          ...formData,
          amount: Number(formData.amount),
          month: Number(formData.month),
          year: Number(formData.year)
        } as CreatePaymentRequest);
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || "Error al guardar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(`¿Estás seguro de que deseas anular/eliminar este pago?`)) {
      try {
        await paymentsService.delete(id);
        fetchData();
      } catch (err: any) {
        alert(err.message || "Error al eliminar el pago");
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getMemberName = (id: string) => {
    const member = members.find(m => m.id === id);
    return member ? member.name : "Socio Desconocido";
  };

  return (
    <DialogRoot open={isDialogOpen} onOpenChange={(e) => setIsDialogOpen(e.open)}>
      <Stack gap="8">
        <Flex justify="space-between" align="center">
          <Stack gap="1">
            <Heading size="2xl" fontWeight="bold">Administración de Pagos</Heading>
            <Text color="fg.muted" fontSize="md">
              Gestiona las cuotas y estados de cuenta de los socios.
            </Text>
          </Stack>
          <HStack gap="3">
            <Button variant="outline" onClick={fetchData} disabled={isLoading}>
              <LuRefreshCw /> Actualizar
            </Button>
            <Button colorPalette="blue" size="md" onClick={openCreateModal}>
              <LuPlus /> Registrar Pago
            </Button>
          </HStack>
        </Flex>

          {/* Modal Form */}
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingPaymentId ? "Editar Pago" : "Registrar Nuevo Pago"}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <Stack gap="4">
                {!editingPaymentId && (
                  <Field label="Socio" required>
                    <SelectRoot
                      collection={membersCollection} 
                      value={formData.member_id ? [formData.member_id]: []}
                      onValueChange={(e) => setFormData({ ...formData, member_id: e.value[0] })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Ej. Juan Pérez" />
                      </SelectTrigger>
                      <SelectContent>
                        {membersCollection.items.map((item) => (
                          <SelectItem item={item} key={item.value}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                )}

                <HStack gap="4">
                  <Field label="Monto ($)" required>
                    <Input 
                      type="number" min="0" step="0.01"
                      placeholder="Ej. 15000"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      required
                    />
                  </Field>
                  <Field label="Vencimiento" required>
                    <Input 
                      type="date" 
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      required
                    />
                  </Field>
                </HStack>

                {!editingPaymentId && (
                  <HStack gap="4">
                    <Field label="Mes" required>
                      <Input 
                        type="number" min="1" max="12"
                        value={formData.month}
                        onChange={(e) => setFormData({ ...formData, month: Number(e.target.value) })}
                        required
                      />
                    </Field>
                    <Field label="Año" required>
                      <Input 
                        type="number" min="2020" max="2100"
                        value={formData.year}
                        onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                        required
                      />
                    </Field>
                  </HStack>
                )}
                
                {editingPaymentId && formData.status && (
                  <Field label="Estado del Pago" required>
                    <SelectRoot 
                      collection={statusCategories} 
                      value={[formData.status]}
                      onValueChange={(e) => setFormData({ ...formData, status: e.value[0] as PaymentStatus })}
                    >
                      <SelectTrigger>
                        <SelectValueText placeholder="Seleccione el estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusCategories.items.map((stat) => (
                          <SelectItem item={stat} key={stat.value}>{stat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </SelectRoot>
                  </Field>
                )}
              </Stack>
            </DialogBody>
            <DialogFooter>
              <DialogActionTrigger asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogActionTrigger>
              <Button type="submit" colorPalette="blue" loading={isSubmitting}>
                {editingPaymentId ? "Guardar Cambios" : "Registrar Pago"}
              </Button>
            </DialogFooter>
            <DialogCloseTrigger />
          </form>
        </DialogContent>

        {error && (
          <Box p="4" bg="red.50" color="red.700" borderRadius="md" borderWidth="1px" borderColor="red.200">
            <Text fontWeight="bold">Error:</Text><Text>{error}</Text>
          </Box>
        )}

        <Box bg="bg.panel" borderRadius="xl" boxShadow="sm" borderWidth="1px" overflow="hidden" minH="300px">
          {isLoading ? (
            <Center h="300px"><Spinner size="xl" color="blue.500" /></Center>
          ) : payments.length === 0 ? (
            <Center h="300px">
              <Stack align="center" gap="4">
                <Text color="fg.muted">No se encontraron pagos registrados.</Text>
              </Stack>
            </Center>
          ) : (
            <Table.Root size="md" variant="line" interactive>
              <Table.Header>
                <Table.Row bg="bg.muted/50">
                  <Table.ColumnHeader py="4">Socio</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Período</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Monto</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Vencimiento</Table.ColumnHeader>
                  <Table.ColumnHeader py="4">Estado</Table.ColumnHeader>
                  <Table.ColumnHeader py="4" textAlign="end">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {payments.map((payment) => (
                  <Table.Row key={payment.id} _hover={{ bg: "bg.muted/30" }}>
                    <Table.Cell fontWeight="semibold">{getMemberName(payment.member_id)}</Table.Cell>
                    <Table.Cell color="fg.muted">{payment.month} / {payment.year}</Table.Cell>
                    <Table.Cell color="fg.emphasized">${payment.amount}</Table.Cell>
                    <Table.Cell color="fg.muted">{payment.due_date}</Table.Cell>
                    <Table.Cell>
                      <Box 
                        display="inline-block" px="2" py="0.5" borderRadius="md" fontSize="xs" fontWeight="bold"
                        bg={payment.status === 'Paid' ? 'green.50' : payment.status === 'Pending' ? 'orange.50' : 'red.50'} 
                        color={payment.status === 'Paid' ? 'green.700' : payment.status === 'Pending' ? 'orange.700' : 'red.700'} 
                      >
                        {payment.status === 'Paid' ? 'Paid' : payment.status === 'Pending' ? 'Pending' : 'Canceled'}
                      </Box>
                    </Table.Cell>
                    <Table.Cell textAlign="end">
                      <HStack gap="2" justify="flex-end">
                        <IconButton variant="ghost" size="sm" onClick={() => openEditModal(payment)}><LuPencil /></IconButton>
                        <IconButton variant="ghost" size="sm" colorPalette="red" onClick={() => handleDelete(payment.id)}><LuTrash2 /></IconButton>
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
  );
}