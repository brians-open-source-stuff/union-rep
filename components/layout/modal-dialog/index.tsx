"use client";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

type ModalDialogProps = {
	children: ReactNode;
	buttonText: ReactNode;
	buttonVariant?: React.ComponentProps<typeof Button>["variant"];
};

export default function ModalDialog({ children, buttonText, buttonVariant = "default" }: ModalDialogProps) {
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