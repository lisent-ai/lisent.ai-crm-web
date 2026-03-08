"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { type Customer, useMockCrmStore } from "@/lib/dashboard/mock-crm-store";

import { CustomerCompanyHeader } from "./customer-company-header";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { CustomerFormModal } from "./customer-form-modal";
import { CustomerListSection } from "./customer-list-section";
import { deriveCountryCode } from "./customer-utils";
import { emptyCustomerForm, type CustomerFormState } from "./customer-types";

export function CustomerDirectory() {
  const searchParams = useSearchParams();
  const { companies, customersByCompany, setCustomersByCompany } = useMockCrmStore();
  const companyId = searchParams.get("company") ?? companies[0]?.id ?? "";
  const companyName =
    searchParams.get("companyName") ??
    companies.find((company) => company.id === companyId)?.name ??
    "Selected company";

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? companies[0],
    [companies, companyId],
  );

  const customers = useMemo(
    () => (selectedCompany ? customersByCompany[selectedCompany.id] ?? [] : []),
    [customersByCompany, selectedCompany],
  );

  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    customers[0]?.id ?? null,
  );
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const matchesSearch =
        !searchQuery.trim() ||
        [
          customer.name,
          customer.email,
          customer.phone,
          customer.status,
          customer.preferredLanguage,
          customer.countryCode,
        ]
          .join(" ")
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase());
      const matchesStatus =
        statusFilter === "All" || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchQuery, statusFilter]);

  const selectedCustomer = useMemo(
    () =>
      filteredCustomers.find((customer) => customer.id === selectedCustomerId) ??
      customers.find((customer) => customer.id === selectedCustomerId) ??
      filteredCustomers[0] ??
      customers[0] ??
      null,
    [customers, filteredCustomers, selectedCustomerId],
  );

  const viewingCustomer = useMemo(
    () => customers.find((customer) => customer.id === viewingCustomerId) ?? null,
    [customers, viewingCustomerId],
  );

  function resetCustomerForm() {
    setCustomerForm(emptyCustomerForm);
    setEditingCustomerId(null);
  }

  function closeAddModal() {
    resetCustomerForm();
    setShowForm(false);
  }

  function closeEditModal() {
    resetCustomerForm();
    setShowEditModal(false);
  }

  function saveCustomer() {
    if (!selectedCompany) {
      return;
    }

    const name = customerForm.name.trim();
    const email = customerForm.email.trim();

    if (!name || !email) {
      return;
    }

    const currentEditingCustomer = editingCustomerId
      ? customers.find((customer) => customer.id === editingCustomerId)
      : undefined;

    const nextCustomer: Customer = {
      id: editingCustomerId ?? `cust-${Date.now()}`,
      companyId: selectedCompany.id,
      name,
      firstName: name.split(/\s+/)[0] ?? name,
      lastName: name.split(/\s+/).slice(1).join(" "),
      email,
      phone: customerForm.phone.trim(),
      status: customerForm.status,
      preferredLanguage: currentEditingCustomer?.preferredLanguage ?? "en",
      countryCode:
        currentEditingCustomer?.countryCode ??
        deriveCountryCode(selectedCompany.country),
      extraData: currentEditingCustomer?.extraData ?? {
        city: "Not set",
        company_name: selectedCompany.name,
        website: "Not set",
        subscription_date: new Date().toISOString().slice(0, 10),
        external_customer_id: `EXT-${Date.now()}`,
        phone_2: "Not set",
      },
    };

    setCustomersByCompany((current) => {
      const currentCustomers = current[selectedCompany.id] ?? [];

      return {
        ...current,
        [selectedCompany.id]: editingCustomerId
          ? currentCustomers.map((customer) =>
              customer.id === editingCustomerId ? nextCustomer : customer,
            )
          : [nextCustomer, ...currentCustomers],
      };
    });

    setSelectedCustomerId(nextCustomer.id);
    resetCustomerForm();
    if (showEditModal) {
      setShowEditModal(false);
    } else {
      setShowForm(false);
    }
  }

  function editCustomer(customer: Customer) {
    setEditingCustomerId(customer.id);
    setSelectedCustomerId(customer.id);
    setCustomerForm({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
    });
    setViewingCustomerId(null);
    setShowForm(false);
    setShowEditModal(true);
  }

  function deleteCustomer(customerId: string) {
    if (!selectedCompany) {
      return;
    }

    const remainingCustomers = (customersByCompany[selectedCompany.id] ?? []).filter(
      (customer) => customer.id !== customerId,
    );

    setCustomersByCompany((current) => ({
      ...current,
      [selectedCompany.id]: remainingCustomers,
    }));

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(remainingCustomers[0]?.id ?? null);
    }

    if (viewingCustomerId === customerId) {
      setViewingCustomerId(null);
    }

    if (editingCustomerId === customerId) {
      closeAddModal();
      closeEditModal();
    }
  }

  function toggleAddModal() {
    if (showForm) {
      closeAddModal();
      return;
    }

    setShowEditModal(false);
    resetCustomerForm();
    setShowForm(true);
  }

  return (
    <div className="grid w-full min-w-0 gap-6">
      <CustomerCompanyHeader
        companyId={selectedCompany?.id ?? "-"}
        companyName={companyName}
        country={selectedCompany?.country ?? "-"}
        industry={selectedCompany?.industry ?? "-"}
        onToggleAddModal={toggleAddModal}
        recordCount={selectedCompany ? customers.length : 0}
        showAddModal={showForm}
      />

      <CustomerListSection
        customers={filteredCustomers}
        onDeleteCustomer={(customer) => deleteCustomer(customer.id)}
        onEditCustomer={editCustomer}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onViewCustomer={(customer) => {
          setSelectedCustomerId(customer.id);
          setViewingCustomerId(customer.id);
        }}
        searchQuery={searchQuery}
        selectedCompanyCountry={selectedCompany?.country ?? "-"}
        selectedCustomerId={selectedCustomer?.id ?? null}
        statusFilter={statusFilter}
      />

      {viewingCustomer && selectedCompany && (
        <CustomerDetailDrawer
          companyCountry={selectedCompany.country}
          companyName={selectedCompany.name}
          customer={viewingCustomer}
          onClose={() => setViewingCustomerId(null)}
        />
      )}

      {showEditModal && selectedCompany && (
        <CustomerFormModal
          form={customerForm}
          mode="edit"
          onClose={closeEditModal}
          onFormChange={setCustomerForm}
          onSubmit={saveCustomer}
          subtitle={selectedCompany.name}
          title={customerForm.name || "Customer"}
        />
      )}

      {showForm && selectedCompany && (
        <CustomerFormModal
          form={customerForm}
          mode="create"
          onClose={closeAddModal}
          onFormChange={setCustomerForm}
          onSubmit={saveCustomer}
          subtitle="Create a new customer record for this company."
          title={companyName}
        />
      )}
    </div>
  );
}
