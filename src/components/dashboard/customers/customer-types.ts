export type CustomerFormState = {
  name: string;
  email: string;
  phone: string;
  status: string;
};

export const emptyCustomerForm: CustomerFormState = {
  name: "",
  email: "",
  phone: "",
  status: "Active",
};

export const customerStatusOptions: Array<{
  value: string;
  labelKey: string;
}> = [
  { value: "Active", labelKey: "customers.status.active" },
  { value: "Prospect", labelKey: "customers.status.prospect" },
  { value: "Needs review", labelKey: "customers.status.needsReview" },
];
