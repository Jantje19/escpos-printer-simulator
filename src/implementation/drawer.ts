export default class Drawer {
  #isOpen: boolean = false;

  get isOpen() {
    return this.#isOpen;
  }

  open() {
    this.#isOpen = true;
  }

  close() {
    this.#isOpen = false;
  }
}
