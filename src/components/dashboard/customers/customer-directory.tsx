"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

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
import { CustomerBulkActionBar } from "./customer-bulk-action-bar";
import { CustomerBulkDeleteModal } from "./customer-bulk-delete-modal";
import { CustomerDeleteModal } from "./customer-delete-modal";
import { CustomerDetailDrawer } from "./customer-detail-drawer";
import { CustomerFormModal } from "./customer-form-modal";
import { CustomerListSection } from "./customer-list-section";
import { deriveCountryCode } from "./customer-utils";
import { emptyCustomerForm, type CustomerFormState } from "./customer-types";

export function CustomerDirectory() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const searchCompanyId = searchParams.get("company") ?? "";
  const searchCompanyName = searchParams.get("companyName");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState(searchCompanyId);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customerForm, setCustomerForm] =
    useState<CustomerFormState>(emptyCustomerForm);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [viewingCustomerId, setViewingCustomerId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
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
            : t("customers.errors.loadCompanies");
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
  }, [t]);

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
        setSelectedCustomerIds(new Set());
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
            : t("customers.errors.loadCustomers");
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
  }, [selectedCompany?.id, t]);

  const companyName = useMemo(() => {
    if (searchCompanyName?.trim()) {
      return searchCompanyName;
    }
    return selectedCompany?.name ?? t("customers.selectedCompany");
  }, [searchCompanyName, selectedCompany?.name, t]);

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
      setSuccessMessage(null);

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
      setSuccessMessage(
        editingCustomerId ? t("customers.success.updated") : t("customers.success.created"),
      );
    } catch (error) {
      const message =
        error instanceof CRMClientError ? error.message : t("customers.errors.saveCustomer");
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
      setSuccessMessage(null);
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

      setSelectedCustomerIds((current) => {
        const next = new Set(current);
        next.delete(customerId);
        return next;
      });
      setCustomerPendingDelete(null);
      setSuccessMessage(t("customers.success.deleted"));
    } catch (error) {
      const message =
        error instanceof CRMClientError ? error.message : t("customers.errors.deleteCustomer");
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

  function toggleOne(customerId: string) {
    setSelectedCustomerIds((current) => {
      const next = new Set(current);
      if (next.has(customerId)) {
        next.delete(customerId);
      } else {
        next.add(customerId);
      }
      return next;
    });
  }

  function toggleAll() {
    setSelectedCustomerIds((current) => {
      if (current.size === filteredCustomers.length) {
        return new Set();
      }
      return new Set(filteredCustomers.map((customer) => customer.id));
    });
  }

  async function handleBulkDelete() {
    if (!selectedCompany || selectedCustomerIds.size === 0) {
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const ids = Array.from(selectedCustomerIds);
    const succeeded: string[] = [];
    const failed: string[] = [];

    for (const id of ids) {
      try {
        await deleteCustomerRequest(id);
        succeeded.push(id);
      } catch {
        failed.push(id);
      }
    }

    const nextCustomers = await reloadCustomers(selectedCompany.id);
    setPendingBulkDelete(false);
    setSelectedCustomerIds(new Set());

    if (selectedCustomerId && !nextCustomers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(nextCustomers[0]?.id ?? null);
    }
    if (viewingCustomerId && !nextCustomers.some((customer) => customer.id === viewingCustomerId)) {
      setViewingCustomerId(null);
    }

    if (failed.length === 0) {
      setSuccessMessage(t("customers.success.bulkDeleted", { count: succeeded.length }));
    } else if (succeeded.length === 0) {
      setErrorMessage(t("customers.errors.bulkDeleteFailed", { count: failed.length }));
    } else {
      setSuccessMessage(
        t("customers.success.bulkDeletedPartial", {
          succeeded: succeeded.length,
          failed: failed.length,
        }),
      );
    }

    setSaving(false);
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
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-red)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-red)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-red)]">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="rounded-2xl border border-[color-mix(in_srgb,_var(--signal-green)_28%,_transparent)] bg-[color-mix(in_srgb,_var(--signal-green)_8%,_var(--surface))] px-4 py-3 text-sm text-[var(--signal-green)]">
          {successMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
          {t("customers.loading")}
        </div>
      )}

      <CustomerListSection
        customers={filteredCustomers}
        onDeleteCustomer={(customer) => setCustomerPendingDelete(customer)}
        onEditCustomer={editCustomer}
        onSearchQueryChange={setSearchQuery}
        onStatusFilterChange={setStatusFilter}
        onToggleAll={toggleAll}
        onToggleOne={toggleOne}
        onViewCustomer={(customer) => {
          setSelectedCustomerId(customer.id);
          setViewingCustomerId(customer.id);
        }}
        searchQuery={searchQuery}
        selectedIds={selectedCustomerIds}
        selectedCompanyCountry={selectedCompany?.country ?? "-"}
        selectedCustomerId={selectedCustomer?.id ?? null}
        statusFilter={statusFilter}
      />

      <CustomerBulkActionBar
        count={selectedCustomerIds.size}
        onClear={() => setSelectedCustomerIds(new Set())}
        onDelete={() => setPendingBulkDelete(true)}
        saving={saving}
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
          title={customerForm.name || t("customers.fields.customer")}
        />
      )}

      {showForm && selectedCompany && (
        <CustomerFormModal
          form={customerForm}
          mode="create"
          onClose={closeAddModal}
          onFormChange={setCustomerForm}
          onSubmit={() => void saveCustomer()}
          subtitle={t("customers.form.createSubtitle")}
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

      {pendingBulkDelete && (
        <CustomerBulkDeleteModal
          count={selectedCustomerIds.size}
          onClose={() => setPendingBulkDelete(false)}
          onConfirmDelete={() => void handleBulkDelete()}
          saving={saving}
        />
      )}
    </div>
  );
}
