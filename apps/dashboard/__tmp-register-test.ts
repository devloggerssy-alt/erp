import type { UseFormRegisterReturn, ChangeHandler, Noop } from "react-hook-form";

type DatePickerFieldProps = {
  value?: string;
  onChange: ChangeHandler | ((value: any) => void);
  onBlur?: ChangeHandler | Noop;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
};

const register = (name: "startDate"): UseFormRegisterReturn<"startDate"> => ({} as any);
const controllerOnChange = ((...event: any[]) => {}) as (...event: any[]) => void;
const controllerOnBlur = (() => {}) as Noop;

function test(props: DatePickerFieldProps) {}

test({ ...register("startDate") });
test({ value: "2024-01-01", onChange: controllerOnChange, onBlur: controllerOnBlur });
