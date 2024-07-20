document.addEventListener('DOMContentLoaded', () => {
    const tooltipTargets = document.querySelectorAll('.tooltip-target');

    tooltipTargets.forEach(target => {
        target.addEventListener('mouseenter', () => {
            const tooltip = target.nextElementSibling;
            tooltip.style.visibility = 'visible';
            tooltip.style.opacity = '1';
        });

        target.addEventListener('mouseleave', () => {
            const tooltip = target.nextElementSibling;
            tooltip.style.visibility = 'hidden';
            tooltip.style.opacity = '0';
        });
    });
});