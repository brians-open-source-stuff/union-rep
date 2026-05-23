import { Button } from "@/components/ui/button";
import registerContactAction from "./register-contact-action";

export default function RegisterContactForm({ employeeId }: { employeeId: string }) {
	const registerForEmployee = registerContactAction.bind(null, employeeId);

	return (
		<form action={registerForEmployee}>
			<Button type="submit" variant="outline">Registrer kontakt i dag</Button>
		</form>
	);
}
