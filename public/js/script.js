function handleSubmit(event) {
    event.preventDefault();
    const name = document.getElementById("name").value;
    alert(`Thank you for registering, ${name}! 🎉`);
    return false;
}