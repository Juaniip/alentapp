export class InvalidLoanStatusError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidLoanStatusError';
    }
}