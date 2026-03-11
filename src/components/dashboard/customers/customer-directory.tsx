"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import {
  CRMClientError,
  createCustomer,
  deleteCustomer as deleteCustomerRequest,
  listCompanies,
  listCustomers,
  type Company,
  type Customer,
  updateCustomer,
} from "@/lib/crm/client";

import { CustomerCompanyHeader } from "./customer-company-header";
import { CustomerDeleteModal } from "./customer-delete-modal";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { CustomerFormModal } from "./customer-form-modal";
import { CustomerListSection } from "./customer-list-section";
import { deriveCountryCode } from "./customer-utils";
import { emptyCustomerForm, type CustomerFormState } from "./customer-types";

export function CustomerDirectory() {
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [customerPendingDelete, setCustomerPendingDelete] =
    useState<Customer | null>(null);

  useEffect(() => {
    setActiveCompanyId(searchCompanyId);
  }, [searchCompanyId]);

  useEffect(() => {
    let cancelled = false;

    async function loadCompanyList() {
      setCompaniesLoading(true);
      setErrorMessage(null);
      try {
        const nextCompanies = await listCompanies();
        if (cancelled) {
          return;
        }
        setCompanies(nextCompanies);
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof CRMClientError
            ? error.message
            : "Failed to load companies.";
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setCompaniesLoading(false);
        }
      }
    }

    void loadCompanyList();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (companies.length === 0) {
      return;
    }

    setActiveCompanyId((current) => {
      if (current && companies.some((company) => company.id === current)) {
        return current;
      }
      return companies[0].id;
    });
  }, [companies]);

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === activeCompanyId) ?? null,
    [activeCompanyId, companies],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCustomerList(companyId: string) {
      setCustomersLoading(true);
      setErrorMessage(null);
      try {
        const nextCustomers = await listCustomers(companyId);
        if (cancelled) {
          return;
        }
        setCustomers(nextCustomers);
        setSelectedCustomerId((current) => {
          if (current && nextCustomers.some((customer) => customer.id === current)) {
            return current;
          }
          return nextCustomers[0]?.id ?? null;
        });
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof CRMClientError
            ? error.message
            : "Failed to load customers.";
        setErrorMessage(message);
      } finally {
        if (!cancelled) {
          setCustomersLoading(false);
        }
      }
    }

    if (!selectedCompany?.id) {
      setCustomers([]);
      setCustomersLoading(false);
      return;
    }

    void loadCustomerList(selectedCompany.id);
    return () => {
      cancelled = true;
    };
  }, [selectedCompany?.id]);

  const companyName = useMemo(() => {
    if (searchCompanyName?.trim()) {
      return searchCompanyName;
    }
    return selectedCompany?.name ?? "Selected company";
  }, [searchCompanyName, selectedCompany?.name]);

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

  async function reloadCustomers(companyId: string) {
    const nextCustomers = await listCustomers(companyId);
    setCustomers(nextCustomers);
    return nextCustomers;
  }

  async function saveCustomer() {
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

    const countryCode =
      currentEditingCustomer?.countryCode || deriveCountryCode(selectedCompany.country);
    const preferredLanguage = currentEditingCustomer?.preferredLanguage || "en";
    const extraData = currentEditingCustomer?.extraData ?? {
      city: "Not set",
      company_name: selectedCompany.name,
      website: "Not set",
      subscription_date: new Date().toISOString().slice(0, 10),
      external_customer_id: `EXT-${Date.now()}`,
      phone_2: "Not set",
    };

    try {
      setErrorMessage(null);

      const payload = {
        companyId: selectedCompany.id,
        name,
        email,
        phone: customerForm.phone.trim(),
        status: customerForm.status,
        preferredLanguage,
        countryCode,
        extraData,
      };

      const savedCustomer = editingCustomerId
        ? await updateCustomer(editingCustomerId, payload)
        : await createCustomer(payload);

      await reloadCustomers(selectedCompany.id);
      setSelectedCustomerId(savedCustomer.id);
      resetCustomerForm();
      if (showEditModal) {
        setShowEditModal(false);
      } else {
        setShowForm(false);
      }
    } catch (error) {
      const message =
        error instanceof CRMClientError ? error.message : "Failed to save customer.";
      setErrorMessage(message);
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

  async function removeCustomer(customerId: string) {
    if (!selectedCompany) {
      return;
    }

    try {
      setErrorMessage(null);
      await deleteCustomerRequest(customerId);
      const nextCustomers = await reloadCustomers(selectedCompany.id);

      if (selectedCustomerId === customerId) {
        setSelectedCustomerId(nextCustomers[0]?.id ?? null);
      }

      if (viewingCustomerId === customerId) {
        setViewingCustomerId(null);
      }

      if (editingCustomerId === customerId) {
        closeAddModal();
        closeEditModal();
      }

      setCustomerPendingDelete(null);
    } catch (error) {
      const message =
        error instanceof CRMClientError ? error.message : "Failed to delete customer.";
      setErrorMessage(message);
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

  const loading = companiesLoading || customersLoading;

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

      {errorMessage && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Loading customer data...
        </div>
      )}

      <CustomerListSection
        customers={filteredCustomers}
        onDeleteCustomer={(customer) => setCustomerPendingDelete(customer)}
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
          onSubmit={() => void saveCustomer()}
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
          onSubmit={() => void saveCustomer()}
          subtitle="Create a new customer record for this company."
          title={companyName}
        />
      )}

      {customerPendingDelete && (
        <CustomerDeleteModal
          customerEmail={customerPendingDelete.email}
          customerName={customerPendingDelete.name}
          onClose={() => setCustomerPendingDelete(null)}
          onConfirmDelete={() => void removeCustomer(customerPendingDelete.id)}
        />
      )}
    </div>
  );
}
