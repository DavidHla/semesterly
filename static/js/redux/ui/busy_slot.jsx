import React, { PropTypes } from 'react';
import { DragSource, DropTarget } from 'react-dnd'
import { HALF_HOUR_HEIGHT_WEEKLY, HALF_HOUR_HEIGHT_WEEKLY_FAKE_MODAL, DRAGTYPES } from '../constants.jsx';


function convertToHalfHours(str) {
    let start = parseInt(str.split(':')[0])
    return str.split(':')[1] == '30' ? start*2 + 1 : start * 2;
}

function convertToStr(halfHours) {
    let num_hours = Math.floor(halfHours/2)
    return halfHours % 2 ? num_hours + ':30' : num_hours + ':00' 
}

const dragSlotSource = {
    beginDrag(props) {
        return {
            timeStart: props.time_start,
            timeEnd: props.time_end,
            id: props.id
        }
    },
    endDrag(props, monitor) {
    }
}

function collectDragSource(connect, monitor) {
    return {
        connectDragSource: connect.dragSource(),
        connectDragPreview: connect.dragPreview(),
        isDragging: monitor.isDragging()
    }
}

const dragSlotTarget = {
  drop(props, monitor) { // move it to current location on drop
    let { timeStart, timeEnd, id } = monitor.getItem();

    let startHalfhour = convertToHalfHours(timeStart)
    let endHalfhour = convertToHalfHours(timeEnd)

    let slotStart = props.time_start
    let slotTop = $('#' + props.id).offset().top
    // number half hours from slot start
    let n = Math.floor((monitor.getClientOffset().y - slotTop)/HALF_HOUR_HEIGHT_WEEKLY)

    let newStartHour = convertToHalfHours(props.time_start) + n
    let newEndHour = newStartHour + (endHalfhour - startHalfhour)

    let newValues = {
      time_start: convertToStr(newStartHour),
      time_end: convertToStr(newEndHour),
      day: props.day
    }
    props.updateCustomSlot(newValues, id);
  },
}

function collectDragDrop(connect, monitor) { // inject props as drop target
  return {
    connectDragTarget: connect.dropTarget(),
  };
}

var lastPreview = null
const createSlotTarget = {
    drop(props, monitor) { // move it to current location on drop
        let { timeStart, id } = monitor.getItem();

        // get the time that the mouse dropped on
        let slotStart = props.time_start
        let slotTop = $('#' + props.id).offset().top
        let n = Math.floor((monitor.getClientOffset().y - slotTop)/HALF_HOUR_HEIGHT_WEEKLY)
        let timeEnd = convertToStr(convertToHalfHours(props.time_start) + n)

        if (timeStart > timeEnd) {
            [timeStart, timeEnd] = [timeEnd, timeStart]
        }
        // props.addCustomSlot(timeStart, timeEnd, props.day, false, new Date().getTime());
        props.updateCustomSlot({preview: false}, id);
    },
    canDrop(props, monitor) { // new custom slot must start and end on the same day
        let { day } = monitor.getItem();
        return day == props.day
    },
    hover(props, monitor) {
        let { timeStart, id } = monitor.getItem()

        // get the time that the mouse dropped on
        let slotStart = props.time_start
        let slotTop = $('#' + props.id).offset().top
        let n = Math.floor((monitor.getClientOffset().y - slotTop)/HALF_HOUR_HEIGHT_WEEKLY)
        if (n == lastPreview) {
            return
        }
        let timeEnd = convertToStr(convertToHalfHours(props.time_start) + n)
        if (convertToHalfHours(timeStart) > convertToHalfHours(timeEnd)) {
          [timeStart, timeEnd] = [timeEnd, timeStart]
        }
        lastPreview = n
        props.updateCustomSlot({time_start: timeStart, time_end: timeEnd}, id)
    }
}

function collectCreateDrop(connect, monitor) { // inject props as drop target
  return {
    connectCreateTarget: connect.dropTarget(),
  };
}

// TODO: set connectDragPreview or update state as preview
class BusySlot extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hovered: false };
        this.onSlotHover = this.onSlotHover.bind(this);
        this.onSlotUnhover = this.onSlotUnhover.bind(this);
    }
    stopPropagation(callback, event) {
        event.stopPropagation();
        callback();
    }
    onSlotHover() {
        this.setState({ hovered : true});
    }
    onSlotUnhover() {
        this.setState({ hovered : false});
    }
    updateName(event) {
        this.props.updateCustomSlot({ name: event.target.value }, this.props.id)
    }
    render() {
        let removeButton = this.state.hovered ? 
            <i className="fa fa-times" 
               onClick={ (event) => this.stopPropagation(this.props.removeCustomSlot, event) }></i> : null;

        let converted_start = uses12HrTime && parseInt(this.props.time_start.split(':')[0]) > 12 ? (parseInt(this.props.time_start.split(':')[0]) - 12) + ":" + ((this.props.time_start.split(':')[1] == 0) ? "00" : this.props.time_start.split(':')[1]) : this.props.time_start
        let converted_end = uses12HrTime && parseInt(this.props.time_end.split(':')[0]) > 12 ? (parseInt(this.props.time_end.split(':')[0]) - 12) + ":" + ((this.props.time_end.split(':')[1] == 0) ? "00" : this.props.time_end.split(':')[1]) : this.props.time_end
        let time = shareAvailability && this.props.foreign ? null : <span>{ converted_start } – { converted_end }</span>;
        return this.props.connectCreateTarget(this.props.connectDragTarget(this.props.connectDragSource(
            <div className="fc-event-container">
                <div className={"fc-time-grid-event fc-event slot"}
                     style={ this.getSlotStyles() }
                     onMouseEnter={ this.onSlotHover }
                     onMouseLeave={ this.onSlotUnhover }
                     id={ this.props.id }>
                    <div className="slot-bar" style={{backgroundColor: this.props.color}} />
                        {removeButton}
                    <div className="fc-content">
                        <div className="fc-time">
                            {time}
                        </div>
                        <div className="fc-time">
                            {/*<input type="text" 
                                name="eventName" 
                                style={ {
                                    backgroundColor: 'transparent',
                                    borderStyle: 'none',
                                    outlineColor: '#aaa',
                                    outlineWidth: '2px',
                                    width: '95%'
                                } } 
                                value={ this.props.name } 
                                onChange={ (event) => this.updateName(event) }/>*/}
                        </div>
                    </div>
                </div>
            </div>
        )));
    }
    // TODO: move this out
    getSlotStyles() {
        let start_hour   = parseInt(this.props.time_start.split(":")[0]),
            start_minute = parseInt(this.props.time_start.split(":")[1]),
            end_hour     = parseInt(this.props.time_end.split(":")[0]),
            end_minute   = parseInt(this.props.time_end.split(":")[1]);

        let slotHeight = this.props.isModal ? HALF_HOUR_HEIGHT_WEEKLY_FAKE_MODAL : HALF_HOUR_HEIGHT_WEEKLY
        let top = (start_hour - 0)*(slotHeight*2 + 2) + (start_minute)*(slotHeight/30);
        let bottom = (end_hour - 0)*(slotHeight*2 + 2) + (end_minute)*(slotHeight/30) - 1;
        let height = bottom - top - 2;
    
        // the cumulative width of this slot and all of the slots it is conflicting with
        let total_slot_widths = 100 - (5 * this.props.depth_level);
        // WIDTH NOW ONLY DEPEDENT ON THE TOTAL SLOT WITH, SUBTRACTING FOR EACH DEPTH LEVEL
        let slot_width_percentage = total_slot_widths;
        // the amount of left margin of this particular slot, in percentage
        let push_left = 5 * this.props.depth_level;
        let foreign_level = shareAvailability && !this.props.foreign ? 100 : 0;
        if (push_left == 50) {
            push_left += .5;
        }
        return {
            top: top, bottom: -bottom, zIndex: 1, left: '0%', right: '0%', 
            backgroundColor: this.props.foreign ? 'grey' : '#ccc',
            width: slot_width_percentage + "%",
            left: push_left + "%",
            zIndex: foreign_level + 10 * this.props.depth_level,
            opacity: shareAvailability && this.props.foreign ? .75 : 1
        };
    }
}

BusySlot.propTypes = {
    connectDragSource: PropTypes.func.isRequired,
    connectDragTarget: PropTypes.func.isRequired,
    isDragging: PropTypes.bool.isRequired,
    time_start: PropTypes.string.isRequired,
    time_end: PropTypes.string.isRequired,
    depth_level: PropTypes.number.isRequired,
    num_conflicts: PropTypes.number.isRequired,
    shift_index: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    id: PropTypes.number.isRequired
}

export default DropTarget(DRAGTYPES.DRAG, dragSlotTarget, collectDragDrop)(
    DropTarget(DRAGTYPES.CREATE, createSlotTarget, collectCreateDrop)(
        DragSource(DRAGTYPES.DRAG, dragSlotSource, collectDragSource)(BusySlot)
    )
)