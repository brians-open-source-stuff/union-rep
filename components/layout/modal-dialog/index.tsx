"use client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export default function ModalDialog({ children, buttonText, buttonVariant = "default" }) {
	return (
		<>
			<Dialog>
				<DialogTrigger render={<Button variant={buttonVariant}>{buttonText}</Button>} />
				<DialogContent>
					{children}
				</DialogContent>
			</Dialog>
		</>
	);
}